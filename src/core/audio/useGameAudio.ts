import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAppStore } from '@/state/app.store';

import type { AmbientCueId, AudioCueId } from './audioCatalog';
import {
  acquireAmbientBed,
  applyAudioSettings,
  configureAudioSystem,
  playCue,
  releaseAmbientBed,
  resumeAudio,
  suspendAudio,
} from './audioEngine';

/**
 * Root wiring: prepares the audio session once, keeps the engine's mix in step
 * with the player's settings, and drops the whole soundscape when the app goes
 * to the background.
 */
export function useAudioSystem() {
  const audioSettings = useAppStore((state) => state.settings.audio);

  useEffect(() => {
    configureAudioSystem();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') resumeAudio();
      else suspendAudio();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    applyAudioSettings(audioSettings);
  }, [audioSettings]);
}

/**
 * Holds one ambient bed open for as long as the screen is mounted. Screens
 * with no room tone of their own simply do not call this and inherit whatever
 * the screen beneath them requested.
 */
export function useAmbientBed(cueId: AmbientCueId) {
  useEffect(() => {
    acquireAmbientBed(cueId);
    return () => releaseAmbientBed(cueId);
  }, [cueId]);
}

/** Plays a cue once, when a viewer or surface first appears. */
export function useCueOnMount(cueId: AudioCueId | null) {
  useEffect(() => {
    if (!cueId) return;
    playCue(cueId);
  }, [cueId]);
}
