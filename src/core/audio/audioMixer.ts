import type { AudioSettings } from '@/state/app.store';

import type { AudioLayer } from './audioCatalog';

/**
 * THE MIXER
 *
 * Pure gain arithmetic, kept away from native modules so the rules that decide
 * how loud the game is can be read and tested on their own.
 *
 * Layer routing:
 * - `ambient`      → ambient volume  (room tone, weather, equipment)
 * - `ui`           → effects volume  (taps, paper, drawers, placements)
 * - `investigation`→ effects volume  (shutters, monitors, confirmations)
 * - `completion`   → music volume    (the only scored, musical cue)
 *
 * Master mute is absolute and beats every other setting.
 */

export function layerVolume(
  layer: AudioLayer,
  settings: AudioSettings,
): number {
  switch (layer) {
    case 'ambient':
      return settings.ambientVolume;
    case 'completion':
      return settings.musicVolume;
    case 'ui':
    case 'investigation':
    default:
      return settings.effectsVolume;
  }
}

/** Final 0–1 volume for a cue, or 0 when it must not be heard at all. */
export function resolveGain(
  layer: AudioLayer,
  cueGain: number,
  settings: AudioSettings,
): number {
  if (settings.masterMuted) return 0;
  const raw = layerVolume(layer, settings) * cueGain;
  if (!Number.isFinite(raw)) return 0;
  return Math.min(1, Math.max(0, raw));
}

/** Below this the cue is inaudible, so it is not worth loading or playing. */
export const AUDIBLE_THRESHOLD = 0.01;

export function isAudible(
  layer: AudioLayer,
  cueGain: number,
  settings: AudioSettings,
): boolean {
  return resolveGain(layer, cueGain, settings) >= AUDIBLE_THRESHOLD;
}
