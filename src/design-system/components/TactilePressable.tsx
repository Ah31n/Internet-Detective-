import type { PropsWithChildren } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { playCue } from '@/core/audio/audioEngine';
import { liftFeedback, selectionFeedback } from '@/core/feedback/haptics';
import { useAppStore } from '@/state/app.store';

import { motion, touch } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressFeedback = 'selection' | 'lift' | 'none';

interface TactilePressableProps extends Omit<PressableProps, 'children' | 'style'> {
  style?: StyleProp<ViewStyle>;
  hapticsEnabled?: boolean;
  pressedScale?: number;
  /** Which haptic the press itself plays. Defaults to a selection tick. */
  feedback?: PressFeedback;
}

/**
 * The single touch primitive.
 *
 * TOUCH → GESTURE → STATE → MOTION → FEEDBACK:
 * the finger lands, the surface compresses immediately, the haptic fires on
 * press-in rather than on release, and the surface springs back when the
 * finger leaves. Hit slop guarantees a comfortable target even where the
 * painted control is deliberately small, so nothing needs pixel-perfect aim.
 */
export function TactilePressable({
  children,
  disabled,
  feedback = 'selection',
  hapticsEnabled = true,
  hitSlop = touch.hitSlop,
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  pressedScale = 0.975,
  style,
  ...props
}: PropsWithChildren<TactilePressableProps>) {
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      delayLongPress={touch.longPressMs}
      disabled={disabled}
      hitSlop={hitSlop}
      onLongPress={
        onLongPress
          ? (event) => {
              liftFeedback(hapticsEnabled);
              onLongPress(event);
            }
          : undefined
      }
      onPress={onPress}
      onPressIn={(event) => {
        // The tap cue is trimmed low and throttled by the engine, so holding
        // a finger down a fast list can never turn into chatter.
        if (feedback === 'selection') {
          selectionFeedback(hapticsEnabled);
          playCue('ui-tap');
        }
        if (feedback === 'lift') liftFeedback(hapticsEnabled);
        if (reduceMotion) {
          opacity.value = withTiming(0.72, { duration: 60 });
        } else {
          scale.value = withSpring(pressedScale, motion.press);
          opacity.value = withTiming(0.9, { duration: motion.quick });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = reduceMotion ? 1 : withSpring(1, motion.press);
        opacity.value = withTiming(1, { duration: motion.quick });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle, disabled ? disabledStyle : null]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

const disabledStyle: ViewStyle = { opacity: 0.35 };
