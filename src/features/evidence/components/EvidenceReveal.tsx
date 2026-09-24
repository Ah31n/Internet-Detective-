/* Reanimated shared values are intentionally mutated inside UI-thread worklets. */
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  curve,
  duration,
  revealIn,
  settleIn,
  stagger,
  useReduceMotion,
} from '@/design-system/motion/motionSystem';
import { motion, palette } from '@/design-system/theme/tokens';

/**
 * EVIDENCE REVEALS
 *
 * Each kind of artifact arrives the way its physical counterpart would.
 * A photograph develops, a document unfolds, a conversation is read down the
 * thread, a receipt is laid on the desk, a camera feed acquires signal, and a
 * captured page paints in from the top. No two share an animation, and none of
 * them repeat once the artifact is on screen.
 */

interface RevealProps {
  style?: StyleProp<ViewStyle>;
}

/** PHOTO — the print develops: it fades up and eases down to true size. */
export function PhotoReveal({
  children,
  style,
}: PropsWithChildren<RevealProps>) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 1.035);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withTiming(1, {
      duration: duration.unfold,
      easing: curve.emerge,
    });
    scale.value = withTiming(1, {
      duration: duration.cinematic,
      easing: curve.emerge,
    });
  }, [opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.fill, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/** DOCUMENT — the sheet unfolds downward from its top edge. */
export function DocumentUnfold({
  children,
  index = 0,
  style,
}: PropsWithChildren<RevealProps & { index?: number }>) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      stagger(index, 90, 270),
      withTiming(1, { duration: duration.unfold, easing: curve.emerge }),
    );
  }, [index, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -10 },
      { scaleY: 0.965 + progress.value * 0.035 },
    ],
  }));

  return (
    <Animated.View style={[styles.unfoldOrigin, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/** MESSAGE — the thread is read in order, one exchange after another. */
export function ConversationReveal({
  children,
  index,
  outgoing = false,
  style,
}: PropsWithChildren<RevealProps & { index: number; outgoing?: boolean }>) {
  const reduceMotion = useReduceMotion();

  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : outgoing
            ? settleIn(true, index)
            : revealIn(true, index)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** RECEIPT — the slip is laid onto the inspection desk and straightens. */
export function ArtifactEnter({
  children,
  style,
}: PropsWithChildren<RevealProps>) {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(reduceMotion ? 0 : 30);
  const tilt = useSharedValue(reduceMotion ? 0 : -1.6);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withTiming(1, {
      duration: duration.reveal,
      easing: curve.emerge,
    });
    offset.value = withSpring(0, motion.settle);
    tilt.value = withSpring(0, motion.settle);
  }, [offset, opacity, reduceMotion, tilt]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: offset.value },
      { rotateZ: `${tilt.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

/** CCTV — the monitor acquires signal: one sweep, then a steady frame. */
export function SurveillanceActivate({
  children,
  style,
}: PropsWithChildren<RevealProps>) {
  const reduceMotion = useReduceMotion();
  const frame = useSharedValue(reduceMotion ? 1 : 0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    frame.value = withTiming(1, {
      duration: duration.reveal,
      easing: curve.emerge,
    });
    // A single pass down the screen. It never runs again.
    sweep.value = withTiming(1, {
      duration: duration.cinematic,
      easing: curve.sweep,
    });
  }, [frame, reduceMotion, sweep]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + frame.value * 0.75,
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 && sweep.value < 1 ? 0.5 - sweep.value * 0.5 : 0,
    top: `${sweep.value * 100}%`,
  }));

  return (
    <Animated.View style={[styles.fill, style, frameStyle]}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]} />
    </Animated.View>
  );
}

/** WEBPAGE — the captured page paints in from the top, section by section. */
export function PageLoad({
  children,
  index = 0,
  style,
}: PropsWithChildren<RevealProps & { index?: number }>) {
  const reduceMotion = useReduceMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : revealIn(true, index)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  unfoldOrigin: {
    transformOrigin: 'top center',
  },
  sweep: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: 2,
    backgroundColor: palette.moss,
  },
});
