/* Reanimated shared values are intentionally mutated inside UI-thread worklets. */
/* eslint-disable react-hooks/immutability */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PropsWithChildren, ReactNode } from 'react';
import { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCueOnMount } from '@/core/audio/useGameAudio';
import { placementFeedback, selectionFeedback } from '@/core/feedback/haptics';
import { useAppStore } from '@/state/app.store';

import { motion, palette, radius, spacing, touch } from '../theme/tokens';
import { AppText } from './AppText';
import { TactilePressable } from './TactilePressable';

interface BottomSheetProps {
  eyebrow: string;
  title?: string;
  onClose: () => void;
  hapticsEnabled?: boolean;
  /** Heights as a fraction of the window, smallest first. */
  detents?: readonly number[];
  initialDetentIndex?: number;
  footer?: ReactNode;
  /** Called whenever the sheet settles on a different detent. */
  onDetentChange?: (index: number) => void;
}

/**
 * A native-feeling sheet, not a web modal.
 *
 * - draggable: the grabber and header track the finger one-to-one
 * - interruptible: a new drag picks the sheet up from wherever the previous
 *   spring left it, mid-flight
 * - dismissible: a downward flick or a drag past the lowest detent throws it
 *   away with its own velocity; so does the backdrop and the Android back
 *   gesture
 * - state-aware: it settles on detents, reports which one it landed on, and
 *   the backdrop darkens in proportion to how far it is open
 */
export function BottomSheet({
  children,
  detents = [0.58, 0.92],
  eyebrow,
  footer,
  hapticsEnabled = true,
  initialDetentIndex = 0,
  onClose,
  onDetentChange,
  title,
}: PropsWithChildren<BottomSheetProps>) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);

  const heights = detents.map((fraction) => Math.round(windowHeight * fraction));
  const maxHeight = heights[heights.length - 1] ?? Math.round(windowHeight * 0.9);
  // translateY is measured from the fully open position.
  const offsets = heights.map((height) => maxHeight - height);
  const closedOffset = maxHeight + insets.bottom + 40;
  const restingOffset = offsets[Math.min(initialDetentIndex, offsets.length - 1)] ?? 0;

  // A sheet arriving is a drawer moving, once, on open.
  useCueOnMount('ui-drawer');

  const translateY = useSharedValue(closedOffset);
  const dragStart = useSharedValue(0);
  const settledIndex = useSharedValue(initialDetentIndex);

  useEffect(() => {
    translateY.value = reduceMotion
      ? restingOffset
      : withSpring(restingOffset, motion.sheet);
  }, [reduceMotion, restingOffset, translateY]);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClosed = useCallback(
    (velocity = 0) => {
      if (reduceMotion) {
        dismiss();
        return;
      }
      translateY.value = withSpring(
        closedOffset,
        { ...motion.sheet, velocity, overshootClamping: true },
        (finished) => {
          if (finished) runOnJS(dismiss)();
        },
      );
    },
    [closedOffset, dismiss, reduceMotion, translateY],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        animateClosed();
        return true;
      },
    );
    return () => subscription.remove();
  }, [animateClosed]);

  const reportDetent = useCallback(
    (index: number) => {
      placementFeedback(hapticsEnabled);
      onDetentChange?.(index);
    },
    [hapticsEnabled, onDetentChange],
  );

  const drag = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onBegin(() => {
      // Interruptible: adopt the current on-screen position mid-animation.
      dragStart.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = dragStart.value + event.translationY;
      // Rubber-band resistance above the tallest detent.
      translateY.value = next < 0 ? next / 3.4 : next;
    })
    .onEnd((event) => {
      const projected = translateY.value + event.velocityY * 0.12;
      const lowestOffset = offsets[0] ?? 0;

      if (
        projected > lowestOffset + 110 ||
        event.velocityY > motion.flickVelocity
      ) {
        runOnJS(animateClosed)(event.velocityY);
        return;
      }

      let nearest = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < offsets.length; index += 1) {
        const distance = Math.abs((offsets[index] ?? 0) - projected);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = index;
        }
      }

      translateY.value = withSpring(offsets[nearest] ?? 0, {
        ...motion.sheet,
        velocity: event.velocityY,
      });
      if (settledIndex.value !== nearest) {
        settledIndex.value = nearest;
        runOnJS(reportDetent)(nearest);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [closedOffset, offsets[0] ?? 0],
      [0, 1],
      'clamp',
    ),
  }));

  return (
    <View style={styles.layer}>
      <Animated.View style={[styles.backdropLayer, backdropStyle]}>
        <TactilePressable
          accessibilityLabel={`Close ${eyebrow.toLowerCase()}`}
          accessibilityRole="button"
          feedback="none"
          hitSlop={0}
          onPress={() => animateClosed()}
          pressedScale={1}
          style={styles.backdrop}
        />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { height: maxHeight, paddingBottom: insets.bottom + spacing.sm },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={drag}>
          <View style={styles.grabArea}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <AppText variant="label" color={palette.brass} numberOfLines={1}>
                  {eyebrow}
                </AppText>
                {title ? (
                  <AppText
                    variant="bodySmall"
                    color={palette.paperMuted}
                    numberOfLines={1}
                  >
                    {title}
                  </AppText>
                ) : null}
              </View>
              <TactilePressable
                accessibilityLabel="Close sheet"
                accessibilityRole="button"
                hapticsEnabled={hapticsEnabled}
                onPress={() => {
                  selectionFeedback(hapticsEnabled);
                  animateClosed();
                }}
                style={styles.close}
              >
                <Ionicons color={palette.paper} name="close" size={24} />
              </TactilePressable>
            </View>
          </View>
        </GestureDetector>

        <View style={styles.body}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  backdropLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,6,3,0.72)',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: palette.charcoal,
    borderTopWidth: 1,
    borderColor: palette.line,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 24,
  },
  grabArea: {
    paddingTop: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.line,
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.sm,
    gap: 2,
  },
  close: {
    width: touch.comfortableTarget,
    height: touch.comfortableTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
});
