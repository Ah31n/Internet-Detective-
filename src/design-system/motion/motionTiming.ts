/**
 * Pure timing vocabulary, kept free of Reanimated so it can be reasoned about
 * (and tested) on its own. `motionSystem` re-exports these.
 */

/** Durations, in milliseconds. Nothing in the game is slower than `cinematic`. */
export const duration = {
  flick: 140,
  brief: 220,
  reveal: 320,
  unfold: 420,
  cinematic: 680,
} as const;

/** Sequential arrivals, capped so a long list never becomes a wait. */
export function stagger(index: number, step = 55, cap = 440): number {
  return Math.min(Math.max(index, 0) * step, cap);
}
