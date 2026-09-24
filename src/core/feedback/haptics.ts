import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Restrained haptic vocabulary.
 *
 * Rules that hold for every export here:
 * - nothing fires when the player has turned haptics off
 * - nothing fires on platforms without a taptic engine
 * - repeated triggers inside {@link MIN_INTERVAL_MS} are dropped, so a drag,
 *   a scroll, or a fast series of taps can never buzz continuously
 * - only case completion plays more than one pulse, and it plays exactly two
 */

const MIN_INTERVAL_MS = 55;
const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let lastFiredAtMs = 0;

/**
 * `incidental` feedback (taps, lifts, landings) yields to the throttle so a
 * gesture can never turn into a buzz. `significant` feedback (a discovery, a
 * contradiction, a closed case) always plays: it is the payoff, and it must
 * not be swallowed because the finger happened to tap a moment earlier.
 */
function shouldFire(enabled: boolean, weight: 'incidental' | 'significant') {
  if (!enabled || !SUPPORTED) return false;
  const nowMs = Date.now();
  if (weight === 'incidental' && nowMs - lastFiredAtMs < MIN_INTERVAL_MS) {
    return false;
  }
  lastFiredAtMs = nowMs;
  return true;
}

/** Testing seam: forget the throttle window. */
export function resetHapticThrottle() {
  lastFiredAtMs = 0;
}

/** Light tick for taps, toggles, tab changes, and picking a value. */
export function selectionFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'incidental')) return;
  void Haptics.selectionAsync();
}

/** An object leaving the surface: long press, artifact lift, sheet detent. */
export function liftFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'incidental')) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** An object landing: artifact settling on the board, sheet snapping. */
export function placementFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'incidental')) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** New evidence recovered into the case file. */
export function discoveryFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'significant')) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** A string pinned between two artifacts. */
export function connectionFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'significant')) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Two artifacts that cannot both be true. */
export function contradictionFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'significant')) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Major confirmation: deduction proven, timeline confirmed, note committed. */
export function confirmationFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'significant')) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** A rejected action. Never repeated while the error stays on screen. */
export function rejectionFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'significant')) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Case closed. The only two-beat pattern in the game: a success notification
 * followed by a single soft echo. It is not a loop and never repeats.
 */
export function completionFeedback(enabled: boolean) {
  if (!shouldFire(enabled, 'significant')) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => {
    if (!enabled || !SUPPORTED) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, 260);
}
