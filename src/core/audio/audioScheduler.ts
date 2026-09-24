/**
 * THE SCHEDULER
 *
 * The soundscape stays sophisticated by refusing work, not by being mixed
 * quietly after the fact. Two rules, both pure and both testable:
 *
 * 1. **Cooldown** — a cue cannot retrigger inside its own cooldown window, so a
 *    drag, a fast series of taps, or a burst of engine transitions can never
 *    turn into chatter.
 * 2. **Concurrency** — at most {@link MAX_CONCURRENT_VOICES} one-shot cues may
 *    be sounding at once. When the game is already speaking with a full voice
 *    count, the newest incidental sound is dropped rather than layered.
 *
 * Ambient beds are not scheduled here: there is only ever one, and it is held
 * open by the screen that asked for it.
 */

export const MAX_CONCURRENT_VOICES = 3;

export interface SchedulerState {
  /** Last granted play time per cue id. */
  readonly lastPlayedAtMs: Readonly<Record<string, number>>;
  /** Wall-clock times at which currently sounding voices free up. */
  readonly voicesBusyUntilMs: readonly number[];
}

export const emptySchedulerState: SchedulerState = {
  lastPlayedAtMs: {},
  voicesBusyUntilMs: [],
};

export interface PlaybackRequest {
  readonly cueId: string;
  readonly cooldownMs: number;
  readonly durationMs: number;
  readonly nowMs: number;
  /** Payoff cues (contradiction, case closed) may take a voice from a tap. */
  readonly priority?: 'incidental' | 'significant';
  readonly maxConcurrent?: number;
}

export interface PlaybackDecision {
  readonly granted: boolean;
  readonly reason: 'granted' | 'cooldown' | 'voices-busy';
  readonly state: SchedulerState;
}

export function requestPlayback(
  state: SchedulerState,
  request: PlaybackRequest,
): PlaybackDecision {
  const {
    cueId,
    cooldownMs,
    durationMs,
    nowMs,
    priority = 'incidental',
    maxConcurrent = MAX_CONCURRENT_VOICES,
  } = request;

  const active = state.voicesBusyUntilMs.filter((until) => until > nowMs);
  const lastPlayedAtMs = state.lastPlayedAtMs[cueId];

  if (lastPlayedAtMs !== undefined && nowMs - lastPlayedAtMs < cooldownMs) {
    return {
      granted: false,
      reason: 'cooldown',
      state: { ...state, voicesBusyUntilMs: active },
    };
  }

  // A significant cue is allowed one extra voice; it is the payoff of an
  // investigation and must not be swallowed by interface noise.
  const ceiling = priority === 'significant' ? maxConcurrent + 1 : maxConcurrent;
  if (active.length >= ceiling) {
    return {
      granted: false,
      reason: 'voices-busy',
      state: { ...state, voicesBusyUntilMs: active },
    };
  }

  return {
    granted: true,
    reason: 'granted',
    state: {
      lastPlayedAtMs: { ...state.lastPlayedAtMs, [cueId]: nowMs },
      voicesBusyUntilMs: [...active, nowMs + Math.max(0, durationMs)],
    },
  };
}
