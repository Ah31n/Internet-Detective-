/**
 * THE AUDIO CATALOGUE
 *
 * Every sound the game can make is declared here, once, with the layer it is
 * mixed on and the rules that keep it quiet. Nothing plays that is not in this
 * table, and nothing in this table is loud, long, or repeated.
 *
 * Assets are synthesised offline by `tools/generate_audio.py` and bundled as
 * small mono WAVs. Sources are resolved lazily and defensively: a cue whose
 * asset cannot be resolved simply never plays.
 */

export type AudioLayer = 'ambient' | 'ui' | 'investigation' | 'completion';

export type AmbientCueId =
  | 'ambient-hotel-room'
  | 'ambient-distant-city'
  | 'ambient-rain'
  | 'ambient-electronic-hum'
  | 'ambient-surveillance-room';

export type UiCueId =
  | 'ui-tap'
  | 'ui-paper'
  | 'ui-drawer'
  | 'ui-evidence-place'
  | 'ui-notification'
  | 'ui-document-open';

export type InvestigationCueId =
  | 'investigation-camera-shutter'
  | 'investigation-cctv-activate'
  | 'investigation-timeline-confirm'
  | 'investigation-contradiction';

export type CompletionCueId = 'completion-case-closed';

export type AudioCueId =
  | AmbientCueId
  | UiCueId
  | InvestigationCueId
  | CompletionCueId;

export interface AudioCue {
  readonly id: AudioCueId;
  readonly layer: AudioLayer;
  /** Deferred so a missing or unbundled asset degrades instead of throwing. */
  readonly load: () => number;
  /** Per-cue trim, applied before the layer volume. */
  readonly gain: number;
  /** Minimum gap between two plays of this cue, in milliseconds. */
  readonly cooldownMs: number;
  /** Roughly how long the cue occupies a voice, for concurrency accounting. */
  readonly durationMs: number;
  readonly loop?: boolean;
  /** One-line description of when this cue is allowed to be heard. */
  readonly usage: string;
}

export const AUDIO_CUES = {
  'ambient-hotel-room': {
    id: 'ambient-hotel-room',
    layer: 'ambient',
    load: () => require('../../../assets/audio/ambient-hotel-room.wav'),
    gain: 1,
    cooldownMs: 0,
    durationMs: 5400,
    loop: true,
    usage: 'Shell screens: the room the detective works out of.',
  },
  'ambient-distant-city': {
    id: 'ambient-distant-city',
    layer: 'ambient',
    load: () => require('../../../assets/audio/ambient-distant-city.wav'),
    gain: 1,
    cooldownMs: 0,
    durationMs: 5400,
    loop: true,
    usage: 'Investigation sections: the city carrying on below the case.',
  },
  'ambient-rain': {
    id: 'ambient-rain',
    layer: 'ambient',
    load: () => require('../../../assets/audio/ambient-rain.wav'),
    gain: 1,
    cooldownMs: 0,
    durationMs: 5400,
    loop: true,
    usage: 'Evidence board: rain against the window behind the wall.',
  },
  'ambient-electronic-hum': {
    id: 'ambient-electronic-hum',
    layer: 'ambient',
    load: () => require('../../../assets/audio/ambient-electronic-hum.wav'),
    gain: 1,
    cooldownMs: 0,
    durationMs: 5400,
    loop: true,
    usage: 'The offline browser: equipment left running.',
  },
  'ambient-surveillance-room': {
    id: 'ambient-surveillance-room',
    layer: 'ambient',
    load: () => require('../../../assets/audio/ambient-surveillance-room.wav'),
    gain: 1,
    cooldownMs: 0,
    durationMs: 5400,
    loop: true,
    usage: 'CCTV inspection: monitors, fans, and a thin ceiling whine.',
  },

  'ui-tap': {
    id: 'ui-tap',
    layer: 'ui',
    load: () => require('../../../assets/audio/ui-tap.wav'),
    gain: 0.5,
    cooldownMs: 90,
    durationMs: 60,
    usage: 'Any tactile press. Trimmed low and throttled so it never chatters.',
  },
  'ui-paper': {
    id: 'ui-paper',
    layer: 'ui',
    load: () => require('../../../assets/audio/ui-paper.wav'),
    gain: 0.8,
    cooldownMs: 160,
    durationMs: 300,
    usage: 'A sheet moved: opening a message thread, turning to a receipt.',
  },
  'ui-drawer': {
    id: 'ui-drawer',
    layer: 'ui',
    load: () => require('../../../assets/audio/ui-drawer.wav'),
    gain: 0.75,
    cooldownMs: 220,
    durationMs: 420,
    usage: 'A bottom sheet or a hint drawer being pulled open.',
  },
  'ui-evidence-place': {
    id: 'ui-evidence-place',
    layer: 'ui',
    load: () => require('../../../assets/audio/ui-evidence-place.wav'),
    gain: 0.85,
    cooldownMs: 140,
    durationMs: 220,
    usage: 'An artifact settling onto the board.',
  },
  'ui-notification': {
    id: 'ui-notification',
    layer: 'ui',
    load: () => require('../../../assets/audio/ui-notification.wav'),
    gain: 0.7,
    cooldownMs: 600,
    durationMs: 500,
    usage: 'Something arrived for the player to read.',
  },
  'ui-document-open': {
    id: 'ui-document-open',
    layer: 'ui',
    load: () => require('../../../assets/audio/ui-document-open.wav'),
    gain: 0.85,
    cooldownMs: 200,
    durationMs: 420,
    usage: 'A document or folder opening, and new evidence recovered.',
  },

  'investigation-camera-shutter': {
    id: 'investigation-camera-shutter',
    layer: 'investigation',
    load: () =>
      require('../../../assets/audio/investigation-camera-shutter.wav'),
    gain: 0.7,
    cooldownMs: 400,
    durationMs: 260,
    usage: 'A photograph entering inspection.',
  },
  'investigation-cctv-activate': {
    id: 'investigation-cctv-activate',
    layer: 'investigation',
    load: () =>
      require('../../../assets/audio/investigation-cctv-activate.wav'),
    gain: 0.8,
    cooldownMs: 800,
    durationMs: 900,
    usage: 'A surveillance record acquiring signal.',
  },
  'investigation-timeline-confirm': {
    id: 'investigation-timeline-confirm',
    layer: 'investigation',
    load: () =>
      require('../../../assets/audio/investigation-timeline-confirm.wav'),
    gain: 0.8,
    cooldownMs: 500,
    durationMs: 1100,
    usage: 'A deduction proven or a timeline event confirmed.',
  },
  'investigation-contradiction': {
    id: 'investigation-contradiction',
    layer: 'investigation',
    load: () =>
      require('../../../assets/audio/investigation-contradiction.wav'),
    gain: 0.85,
    cooldownMs: 700,
    durationMs: 1200,
    usage: 'Two accounts that cannot both hold. Dark, short, never triumphant.',
  },

  'completion-case-closed': {
    id: 'completion-case-closed',
    layer: 'completion',
    load: () => require('../../../assets/audio/completion-case-closed.wav'),
    gain: 1,
    cooldownMs: 4000,
    durationMs: 2600,
    usage: 'The file is stamped. Plays once per closed case.',
  },
} as const satisfies Record<AudioCueId, AudioCue>;

/** Iteration-friendly view of the catalogue. */
export const AUDIO_CUE_LIST: readonly AudioCue[] = Object.values(AUDIO_CUES);

export const AMBIENT_CUE_IDS = Object.values(AUDIO_CUES)
  .filter((cue) => cue.layer === 'ambient')
  .map((cue) => cue.id) as readonly AmbientCueId[];

export function getAudioCue(id: AudioCueId): AudioCue {
  return AUDIO_CUES[id];
}

/**
 * Resolves a cue's bundled asset. Returns `null` — never throws — when the
 * asset is missing from the build, so audio can fail silently by design.
 */
export function resolveAudioSource(cue: AudioCue): number | null {
  try {
    const source = cue.load();
    return typeof source === 'number' ? source : null;
  } catch {
    return null;
  }
}
