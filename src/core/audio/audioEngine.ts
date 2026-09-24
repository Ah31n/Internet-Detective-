import type { AudioPlayer } from 'expo-audio';

import type { AudioSettings } from '@/state/app.store';
import { defaultAudioSettings } from '@/state/app.store';

import {
  getAudioCue,
  resolveAudioSource,
  type AmbientCueId,
  type AudioCueId,
} from './audioCatalog';
import { isAudible, resolveGain } from './audioMixer';
import {
  emptySchedulerState,
  requestPlayback,
  type SchedulerState,
} from './audioScheduler';

/**
 * THE AUDIO ENGINE
 *
 * A single quiet mixer for the whole game.
 *
 * Contract, in order of importance:
 *
 * 1. **It can never crash the game.** Every call into the native audio module
 *    goes through {@link safely}. A cue that throws once is marked unavailable
 *    and is never attempted again; the investigation continues in silence.
 * 2. **It loads as little as possible.** Nothing is loaded at startup. A cue is
 *    created the first time it is actually audible, and the one-shot cache is
 *    capped at {@link MAX_CACHED_PLAYERS} — the least recently used player is
 *    released. Ambient beds are loaded only while a screen asks for one, and
 *    released when it stops.
 * 3. **It refuses work.** Cooldowns and a voice ceiling live in
 *    `audioScheduler`; inaudible cues (muted, or a zero layer volume) are never
 *    loaded at all.
 */

const MAX_CACHED_PLAYERS = 5;

type AudioModule = typeof import('expo-audio');

let cachedModule: AudioModule | null | undefined;
let settings: AudioSettings = defaultAudioSettings;
let scheduler: SchedulerState = emptySchedulerState;
let suspended = false;

/** Cue ids whose asset or player failed. They are never retried. */
const unavailable = new Set<AudioCueId>();
/** LRU cache of short one-shot players, most recently used last. */
const oneShots = new Map<AudioCueId, AudioPlayer>();

let ambient: { id: AmbientCueId; player: AudioPlayer } | null = null;
/**
 * Screens request a bed rather than setting one, because a navigation overlaps
 * two screens: the arriving one mounts before the leaving one unmounts. The
 * most recent live request wins, and a screen going away only takes its own.
 */
let ambientRequests: AmbientCueId[] = [];

function topAmbientRequest(): AmbientCueId | null {
  return ambientRequests[ambientRequests.length - 1] ?? null;
}

function safely<T>(label: string, operation: () => T): T | null {
  try {
    return operation();
  } catch (error) {
    if (__DEV__) {
      console.warn(`[audio] ${label} failed; continuing without it.`, error);
    }
    return null;
  }
}

function getModule(): AudioModule | null {
  if (cachedModule !== undefined) return cachedModule;
  cachedModule =
    safely(
      'module load',
      // Deferred on purpose: a build without the native audio module must
      // still run the investigation, silently.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      () => require('expo-audio') as AudioModule,
    ) ?? null;
  return cachedModule;
}

function createPlayer(cueId: AudioCueId): AudioPlayer | null {
  if (unavailable.has(cueId)) return null;
  const audio = getModule();
  if (!audio) {
    unavailable.add(cueId);
    return null;
  }
  const source = resolveAudioSource(getAudioCue(cueId));
  if (source === null) {
    unavailable.add(cueId);
    return null;
  }
  const player = safely(`create ${cueId}`, () => audio.createAudioPlayer(source));
  if (!player) {
    unavailable.add(cueId);
    return null;
  }
  return player;
}

function releasePlayer(player: AudioPlayer) {
  safely('release', () => {
    player.pause();
    player.remove();
  });
}

function evictIfNeeded() {
  while (oneShots.size > MAX_CACHED_PLAYERS) {
    const oldest = oneShots.keys().next();
    if (oldest.done) return;
    const player = oneShots.get(oldest.value);
    oneShots.delete(oldest.value);
    if (player) releasePlayer(player);
  }
}

function touch(cueId: AudioCueId, player: AudioPlayer) {
  oneShots.delete(cueId);
  oneShots.set(cueId, player);
  evictIfNeeded();
}

// --------------------------------------------------------------------------- //
// public surface
// --------------------------------------------------------------------------- //

/**
 * Prepares the audio session. Mixes with other apps and honours the hardware
 * silent switch: a detective game should never talk over someone's music.
 */
export function configureAudioSystem() {
  const audio = getModule();
  if (!audio) return;
  safely('configure session', () => {
    void audio
      .setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      })
      .catch(() => undefined);
  });
}

/** Pushes the player's current mix into anything already sounding. */
export function applyAudioSettings(next: AudioSettings) {
  settings = next;
  if (ambient) {
    const cue = getAudioCue(ambient.id);
    const gain = resolveGain(cue.layer, cue.gain, settings);
    safely('ambient gain', () => {
      ambient!.player.volume = gain;
      if (gain < 0.01 || suspended) {
        ambient!.player.pause();
      } else if (!ambient!.player.playing) {
        ambient!.player.play();
      }
    });
    // A bed that has been silenced is also unloaded: there is no reason to
    // hold a decoder open for something nobody can hear.
    if (gain < 0.01) stopAmbientBed();
  } else {
    setAmbientBed(topAmbientRequest());
  }
}

export function playCue(
  cueId: AudioCueId,
  options?: { priority?: 'incidental' | 'significant' },
) {
  if (suspended) return;
  if (unavailable.has(cueId)) return;

  const cue = getAudioCue(cueId);
  if (cue.loop) return; // ambient beds go through setAmbientBed
  if (!isAudible(cue.layer, cue.gain, settings)) return;

  const decision = requestPlayback(scheduler, {
    cueId,
    cooldownMs: cue.cooldownMs,
    durationMs: cue.durationMs,
    nowMs: Date.now(),
    priority: options?.priority ?? 'incidental',
  });
  scheduler = decision.state;
  if (!decision.granted) return;

  const player = oneShots.get(cueId) ?? createPlayer(cueId);
  if (!player) return;
  touch(cueId, player);

  safely(`play ${cueId}`, () => {
    player.volume = resolveGain(cue.layer, cue.gain, settings);
    void player.seekTo(0)?.catch?.(() => undefined);
    player.play();
  });
}

/** Starts (or switches to) the single looping bed. `null` stops ambience. */
function setAmbientBed(cueId: AmbientCueId | null) {
  if (cueId === null) {
    stopAmbientBed();
    return;
  }
  if (ambient?.id === cueId) return;

  const cue = getAudioCue(cueId);
  if (!isAudible(cue.layer, cue.gain, settings) || suspended) {
    stopAmbientBed();
    return;
  }

  stopAmbientBed();
  const player = createPlayer(cueId);
  if (!player) return;
  ambient = { id: cueId, player };
  safely(`ambient ${cueId}`, () => {
    player.loop = true;
    player.volume = resolveGain(cue.layer, cue.gain, settings);
    player.play();
  });
}

/** A screen asks for a bed for as long as it is mounted. */
export function acquireAmbientBed(cueId: AmbientCueId) {
  ambientRequests = [...ambientRequests, cueId];
  setAmbientBed(topAmbientRequest());
}

/** ...and gives back exactly its own request when it leaves. */
export function releaseAmbientBed(cueId: AmbientCueId) {
  const index = ambientRequests.lastIndexOf(cueId);
  if (index === -1) return;
  ambientRequests = [
    ...ambientRequests.slice(0, index),
    ...ambientRequests.slice(index + 1),
  ];
  setAmbientBed(topAmbientRequest());
}

export function stopAmbientBed() {
  if (!ambient) return;
  releasePlayer(ambient.player);
  ambient = null;
}

/** Called when the app leaves the foreground: the room goes quiet. */
export function suspendAudio() {
  suspended = true;
  stopAmbientBed();
  for (const player of oneShots.values()) {
    safely('pause', () => player.pause());
  }
}

export function resumeAudio() {
  suspended = false;
  setAmbientBed(topAmbientRequest());
}

/** Full teardown. Used on shutdown and by tests. */
export function releaseAudio() {
  stopAmbientBed();
  for (const player of oneShots.values()) releasePlayer(player);
  oneShots.clear();
  scheduler = emptySchedulerState;
  ambientRequests = [];
  suspended = false;
}

/** Read-only view for the settings screen's audio status line. */
export function getAudioDiagnostics() {
  return {
    moduleAvailable: getModule() !== null,
    unavailableCueIds: [...unavailable],
    loadedOneShots: oneShots.size,
    ambientCueId: ambient?.id ?? null,
    suspended,
  };
}
