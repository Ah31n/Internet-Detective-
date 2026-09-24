/* Reanimated shared values are intentionally mutated inside UI-thread worklets. */
/* eslint-disable react-hooks/immutability */
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { liftFeedback, placementFeedback } from '@/core/feedback/haptics';
import { motion, palette } from '@/design-system/theme/tokens';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.4;

interface ZoomableSurfaceProps {
  hapticsEnabled?: boolean;
  /** Mirrors "the player is zoomed in" so a parent can stand down its own
   *  dismiss gesture while the finger is inspecting detail. */
  zoomed?: SharedValue<number>;
  onZoomChange?: (zoomed: boolean) => void;
}

/**
 * Inspection surface for evidence media.
 *
 * Pinch is focal-point accurate, one finger pans only once the content is
 * larger than the frame (so a single finger never fights the parent),
 * double tap toggles a detail zoom at the tapped point, and the content
 * springs back inside its bounds the moment the fingers leave.
 */
export function ZoomableSurface({
  children,
  hapticsEnabled = true,
  onZoomChange,
  zoomed,
}: PropsWithChildren<ZoomableSurfaceProps>) {
  const frameWidth = useSharedValue(0);
  const frameHeight = useSharedValue(0);

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const publishZoom = (isZoomed: boolean) => {
    onZoomChange?.(isZoomed);
  };

  const syncZoomFlag = (next: number) => {
    'worklet';
    const isZoomed = next > 1.01;
    if (zoomed) zoomed.value = isZoomed ? 1 : 0;
    runOnJS(publishZoom)(isZoomed);
  };

  const boundsX = (nextScale: number) => {
    'worklet';
    return Math.max(0, (frameWidth.value * nextScale - frameWidth.value) / 2);
  };
  const boundsY = (nextScale: number) => {
    'worklet';
    return Math.max(0, (frameHeight.value * nextScale - frameHeight.value) / 2);
  };

  const settle = () => {
    'worklet';
    const nextScale = clamp(scale.value, MIN_SCALE, MAX_SCALE);
    const limitX = boundsX(nextScale);
    const limitY = boundsY(nextScale);
    scale.value = withSpring(nextScale, motion.spring);
    translateX.value = withSpring(
      clamp(translateX.value, -limitX, limitX),
      motion.spring,
    );
    translateY.value = withSpring(
      clamp(translateY.value, -limitY, limitY),
      motion.spring,
    );
    syncZoomFlag(nextScale);
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      startScale.value = scale.value;
      focalX.value = event.focalX - frameWidth.value / 2;
      focalY.value = event.focalY - frameHeight.value / 2;
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(liftFeedback)(hapticsEnabled);
    })
    .onUpdate((event) => {
      const next = clamp(startScale.value * event.scale, 0.85, MAX_SCALE + 0.6);
      const ratio = next / startScale.value;
      scale.value = next;
      // Keep the pinched point of the artifact under the fingers.
      translateX.value = focalX.value + (startX.value - focalX.value) * ratio;
      translateY.value = focalY.value + (startY.value - focalY.value) * ratio;
    })
    .onEnd(() => {
      settle();
    });

  const pan = Gesture.Pan()
    .maxPointers(2)
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1.01) return;
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      if (scale.value <= 1.01) return;
      const limitX = boundsX(scale.value);
      const limitY = boundsY(scale.value);
      translateX.value = withSpring(
        clamp(translateX.value + event.velocityX * 0.04, -limitX, limitX),
        { ...motion.spring, velocity: event.velocityX },
      );
      translateY.value = withSpring(
        clamp(translateY.value + event.velocityY * 0.04, -limitY, limitY),
        { ...motion.spring, velocity: event.velocityY },
      );
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
      const zoomingIn = scale.value <= 1.01;
      const nextScale = zoomingIn ? DOUBLE_TAP_SCALE : 1;
      if (zoomingIn) {
        const pointX = event.x - frameWidth.value / 2;
        const pointY = event.y - frameHeight.value / 2;
        const limitX = boundsX(nextScale);
        const limitY = boundsY(nextScale);
        translateX.value = withSpring(
          clamp(-pointX * (nextScale - 1), -limitX, limitX),
          motion.spring,
        );
        translateY.value = withSpring(
          clamp(-pointY * (nextScale - 1), -limitY, limitY),
          motion.spring,
        );
      } else {
        translateX.value = withSpring(0, motion.spring);
        translateY.value = withSpring(0, motion.spring);
      }
      scale.value = withSpring(nextScale, motion.spring);
      syncZoomFlag(nextScale);
      runOnJS(placementFeedback)(hapticsEnabled);
    });

  const gesture = Gesture.Simultaneous(
    Gesture.Race(doubleTap, pan),
    pinch,
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    frameWidth.value = event.nativeEvent.layout.width;
    frameHeight.value = event.nativeEvent.layout.height;
  };

  return (
    <GestureDetector gesture={gesture}>
      <View onLayout={onLayout} style={styles.frame}>
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: palette.black,
  },
  content: {
    flex: 1,
  },
});
