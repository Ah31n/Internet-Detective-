import { describe, expect, it } from 'vitest';

import {
  MAX_CONCURRENT_VOICES,
  emptySchedulerState,
  requestPlayback,
  type SchedulerState,
} from '../audioScheduler';

/**
 * PHASE 13 — the soundscape stays quiet because the scheduler refuses work.
 * These tests pin the two rules that keep it sophisticated: cooldowns and a
 * voice ceiling.
 */

function play(
  state: SchedulerState,
  cueId: string,
  nowMs: number,
  overrides: Partial<Parameters<typeof requestPlayback>[1]> = {},
) {
  return requestPlayback(state, {
    cueId,
    cooldownMs: 100,
    durationMs: 200,
    nowMs,
    ...overrides,
  });
}

describe('phase 13 · audio scheduler', () => {
  it('grants the first play of a cue', () => {
    const decision = play(emptySchedulerState, 'ui-tap', 1_000);
    expect(decision.granted).toBe(true);
    expect(decision.reason).toBe('granted');
  });

  it('drops a retrigger inside the cue cooldown, so taps never chatter', () => {
    const first = play(emptySchedulerState, 'ui-tap', 1_000);
    const second = play(first.state, 'ui-tap', 1_040);
    expect(second.granted).toBe(false);
    expect(second.reason).toBe('cooldown');
  });

  it('allows the cue again once its cooldown has elapsed', () => {
    const first = play(emptySchedulerState, 'ui-tap', 1_000);
    const later = play(first.state, 'ui-tap', 1_200);
    expect(later.granted).toBe(true);
  });

  it('caps how many one-shot cues can sound at the same moment', () => {
    let state = emptySchedulerState;
    for (let index = 0; index < MAX_CONCURRENT_VOICES; index += 1) {
      const decision = play(state, `cue-${index}`, 1_000);
      expect(decision.granted).toBe(true);
      state = decision.state;
    }
    const overflow = play(state, 'cue-extra', 1_000);
    expect(overflow.granted).toBe(false);
    expect(overflow.reason).toBe('voices-busy');
  });

  it('lets a payoff cue through when interface noise has taken every voice', () => {
    let state = emptySchedulerState;
    for (let index = 0; index < MAX_CONCURRENT_VOICES; index += 1) {
      state = play(state, `cue-${index}`, 1_000).state;
    }
    const payoff = play(state, 'investigation-contradiction', 1_000, {
      priority: 'significant',
    });
    expect(payoff.granted).toBe(true);
  });

  it('frees voices as their cues finish', () => {
    let state = emptySchedulerState;
    for (let index = 0; index < MAX_CONCURRENT_VOICES; index += 1) {
      state = play(state, `cue-${index}`, 1_000).state;
    }
    const afterwards = play(state, 'cue-extra', 1_500);
    expect(afterwards.granted).toBe(true);
    expect(afterwards.state.voicesBusyUntilMs).toHaveLength(1);
  });
});
