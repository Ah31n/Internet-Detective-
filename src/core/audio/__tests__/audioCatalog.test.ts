import { describe, expect, it } from 'vitest';

import {
  AMBIENT_CUE_IDS,
  AUDIO_CUE_LIST,
  getAudioCue,
} from '../audioCatalog';

/**
 * PHASE 13 — the catalogue is the whole vocabulary of the game's sound. These
 * tests hold it to the rules the design asks for: quiet, short, throttled, and
 * nothing looping except ambience.
 */

const cues = AUDIO_CUE_LIST;

describe('phase 13 · audio catalogue', () => {
  it('covers all four layers', () => {
    const layers = new Set(cues.map((cue) => cue.layer));
    expect([...layers].sort()).toEqual([
      'ambient',
      'completion',
      'investigation',
      'ui',
    ]);
  });

  it('keys every cue by its own id', () => {
    for (const cue of cues) {
      expect(getAudioCue(cue.id).id).toBe(cue.id);
    }
  });

  it('loops ambience and nothing else', () => {
    for (const cue of cues) {
      expect(Boolean(cue.loop)).toBe(cue.layer === 'ambient');
    }
    expect(AMBIENT_CUE_IDS).toHaveLength(5);
  });

  it('keeps one-shot cues short enough to stay out of the way', () => {
    for (const cue of cues.filter((item) => item.layer !== 'ambient')) {
      expect(cue.durationMs).toBeLessThanOrEqual(2600);
    }
  });

  it('throttles every one-shot cue, and never throttles a bed', () => {
    for (const cue of cues) {
      if (cue.layer === 'ambient') {
        expect(cue.cooldownMs).toBe(0);
      } else {
        expect(cue.cooldownMs).toBeGreaterThan(0);
      }
    }
  });

  it('trims the tap cue furthest down, because it is heard most often', () => {
    const tap = getAudioCue('ui-tap');
    for (const cue of cues) {
      expect(tap.gain).toBeLessThanOrEqual(cue.gain);
    }
    expect(tap.cooldownMs).toBeGreaterThanOrEqual(60);
  });

  it('documents when each cue is allowed to be heard', () => {
    for (const cue of cues) {
      expect(cue.usage.length).toBeGreaterThan(10);
    }
  });
});
