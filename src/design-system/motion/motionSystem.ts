import { useEffect, useState } from 'react';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';

import { useAppStore } from '@/state/app.store';

import { duration, stagger } from './motionTiming';

/**
 * THE MOTION SYSTEM
 *
 * Quiet, physical, deliberate, cinematic, tactile — never flashy.
 *
 * Every animation in the game has to justify itself by communicating state:
 * something arrived, something settled, something was confirmed. Nothing
 * loops, nothing pulses for decoration, and everything collapses to an
 * instant state change when the player asks for reduced motion.
 */

/** Curves. Arrivals decelerate; departures accelerate; sweeps ease both ends. */
export const curve = {
  emerge: Easing.out(Easing.cubic),
  recede: Easing.in(Easing.cubic),
  settle: Easing.inOut(Easing.quad),
  sweep: Easing.inOut(Easing.cubic),
} as const;

export { duration, stagger } from './motionTiming';

export function useReduceMotion(): boolean {
  return useAppStore((state) => state.settings.reduceMotion);
}

type Entering = FadeIn | FadeInDown | FadeInUp | undefined;
type Exiting = FadeOut | undefined;

/** Plain arrival: the element is simply now present. */
export function revealIn(enabled: boolean, index = 0): Entering {
  if (!enabled) return undefined;
  return FadeIn.duration(duration.reveal).delay(stagger(index));
}

/** Arrival with weight, for objects placed onto a surface. */
export function settleIn(enabled: boolean, index = 0): Entering {
  if (!enabled) return undefined;
  return FadeInDown.duration(duration.unfold)
    .delay(stagger(index))
    .springify()
    .damping(18);
}

/** Arrival from below, for artifacts entering inspection. */
export function liftIn(enabled: boolean, index = 0): Entering {
  if (!enabled) return undefined;
  return FadeInUp.duration(duration.reveal).delay(stagger(index));
}

export function fadeOut(enabled: boolean): Exiting {
  if (!enabled) return undefined;
  return FadeOut.duration(duration.brief);
}

/**
 * Advances through a fixed number of stages, holding each for `holdMs`.
 * Used for the launch sequence and the conclusion, both of which are short
 * cinematic runs rather than idle animation. Reduced motion jumps straight
 * to the final stage.
 */
export function useStagedSequence(
  stageCount: number,
  holdMs: number,
  enabled: boolean,
): number {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (stage >= stageCount - 1) return;
    const timer = setTimeout(() => setStage((current) => current + 1), holdMs);
    return () => clearTimeout(timer);
  }, [enabled, holdMs, stage, stageCount]);

  // Reduced motion never waits: the final state is the only state.
  return enabled ? stage : stageCount - 1;
}
