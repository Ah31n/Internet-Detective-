import { describe, expect, it } from 'vitest';

import { defaultAudioSettings, type AudioSettings } from '@/state/app.store';

import { isAudible, layerVolume, resolveGain } from '../audioMixer';

/**
 * PHASE 13 — the mixer decides how loud the game is allowed to be. It is pure
 * arithmetic on the player's own settings, so it can be pinned down exactly.
 */

const settings = (overrides: Partial<AudioSettings> = {}): AudioSettings => ({
  ...defaultAudioSettings,
  ...overrides,
});

describe('phase 13 · audio mixer', () => {
  it('routes each layer to the volume the player expects to control', () => {
    const mix = settings({
      musicVolume: 0.1,
      effectsVolume: 0.5,
      ambientVolume: 0.9,
    });
    expect(layerVolume('ambient', mix)).toBe(0.9);
    expect(layerVolume('ui', mix)).toBe(0.5);
    expect(layerVolume('investigation', mix)).toBe(0.5);
    expect(layerVolume('completion', mix)).toBe(0.1);
  });

  it('silences everything when the master mute is on', () => {
    const muted = settings({ masterMuted: true });
    expect(resolveGain('ambient', 1, muted)).toBe(0);
    expect(resolveGain('ui', 1, muted)).toBe(0);
    expect(resolveGain('completion', 1, muted)).toBe(0);
    expect(isAudible('investigation', 1, muted)).toBe(false);
  });

  it('multiplies the per-cue trim by its layer volume', () => {
    const mix = settings({ effectsVolume: 0.5 });
    expect(resolveGain('ui', 0.5, mix)).toBeCloseTo(0.25);
  });

  it('never returns a gain outside the playable range', () => {
    const loud = settings({ effectsVolume: 1 });
    expect(resolveGain('ui', 4, loud)).toBe(1);
    expect(resolveGain('ui', -2, loud)).toBe(0);
    expect(resolveGain('ui', Number.NaN, loud)).toBe(0);
  });

  it('treats a layer turned down to nothing as inaudible, so it is never loaded', () => {
    const quiet = settings({ ambientVolume: 0 });
    expect(isAudible('ambient', 1, quiet)).toBe(false);
    expect(isAudible('ui', 1, quiet)).toBe(true);
  });

  it('ships defaults that are restrained rather than full volume', () => {
    expect(defaultAudioSettings.masterMuted).toBe(false);
    expect(defaultAudioSettings.ambientVolume).toBeLessThan(
      defaultAudioSettings.effectsVolume,
    );
    expect(defaultAudioSettings.effectsVolume).toBeLessThanOrEqual(0.8);
  });
});
