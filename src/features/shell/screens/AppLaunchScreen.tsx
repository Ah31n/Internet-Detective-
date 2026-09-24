import { router, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getCaseDefinition } from '@/case-content/caseRegistry';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import {
  curve,
  duration as motionDuration,
  revealIn,
  useStagedSequence,
} from '@/design-system/motion/motionSystem';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { BrandSeal } from '../components/BrandSeal';

/** Hold per stage. Three stages plus a short settle is a little over a second. */
const STAGE_MS = 300;

/**
 * LAUNCH SEQUENCE
 *
 * insignia → subtle reveal → investigation state restoration → Investigation Home.
 *
 * The sequence is a status report, not a splash animation: the marks that
 * appear are the ones the player is waiting on. Reduced motion skips straight
 * to the restored state and leaves immediately.
 */
/** Printed on the launch plate. Reads the shipped version, never a literal. */
const BUILD_VERSION = String(Constants.expoConfig?.version ?? '1.0.0');

export function AppLaunchScreen() {
  const lastRoute = useAppStore((state) => state.lastRoute);
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const motionEnabled = !reduceMotion;
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const progress = useCaseSessionStore((state) =>
    activeCaseId ? state.progress[activeCaseId] : undefined,
  );
  const definition = activeCaseId ? getCaseDefinition(activeCaseId) : undefined;

  const stage = useStagedSequence(3, STAGE_MS, motionEnabled);

  const sealOpacity = useSharedValue(motionEnabled ? 0 : 1);
  const sealScale = useSharedValue(motionEnabled ? 0.94 : 1);
  const ruleScale = useSharedValue(motionEnabled ? 0 : 1);

  useEffect(() => {
    sealOpacity.value = withTiming(1, {
      duration: motionEnabled ? motionDuration.unfold : 0,
      easing: curve.emerge,
    });
    sealScale.value = withTiming(1, {
      duration: motionEnabled ? motionDuration.cinematic : 0,
      easing: curve.emerge,
    });
  }, [motionEnabled, sealOpacity, sealScale]);

  useEffect(() => {
    if (stage < 1) return;
    ruleScale.value = withTiming(1, {
      duration: motionEnabled ? motionDuration.unfold : 0,
      easing: curve.sweep,
    });
  }, [motionEnabled, ruleScale, stage]);

  useEffect(() => {
    if (stage < 2) return;
    const timer = setTimeout(
      () => router.replace(lastRoute as Href),
      motionEnabled ? 240 : 0,
    );
    return () => clearTimeout(timer);
  }, [lastRoute, motionEnabled, stage]);

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [{ scale: sealScale.value }],
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ruleScale.value }],
  }));

  const restorationLine = definition
    ? `${definition.id.toUpperCase()} · ${definition.metadata.title.toUpperCase()}`
    : 'NO ACTIVE CASE FILE';
  const restorationDetail = progress?.completed
    ? 'CASE CLOSED · ARCHIVE READY'
    : progress
      ? 'INVESTIGATION STATE RESTORED'
      : 'LOCAL ARCHIVE READY';

  return (
    <Screen safeArea={false} style={styles.screen}>
      <StatusBar hidden />
      <View style={styles.registrationTop} />
      <View style={styles.registrationBottom} />

      <Animated.View style={[styles.identity, sealStyle]}>
        <BrandSeal size={86} />
        <AppText variant="label" color={palette.brass} style={styles.overline}>
          PRIVATE INVESTIGATION NETWORK
        </AppText>
        <AppText variant="display" style={styles.title}>
          INTERNET{`\n`}DETECTIVE
        </AppText>
        <Animated.View style={[styles.line, ruleStyle]} />
        <AppText variant="mono" color={palette.paperMuted}>
          SECURE FIELD DESK · AUTHORIZED DEVICE
        </AppText>
      </Animated.View>

      <View style={styles.restoration}>
        {stage >= 1 ? (
          <Animated.View entering={revealIn(motionEnabled)} style={styles.restorationRow}>
            <View style={styles.restorationPip} />
            <AppText variant="mono" color={palette.paperMuted} numberOfLines={1}>
              {restorationLine}
            </AppText>
          </Animated.View>
        ) : null}
        {stage >= 2 ? (
          <Animated.View entering={revealIn(motionEnabled)}>
            <AppText variant="mono" color={palette.moss} numberOfLines={1}>
              {restorationDetail}
            </AppText>
          </Animated.View>
        ) : null}
      </View>

      <AppText variant="mono" color={palette.line} style={styles.buildLabel}>
        MOBILE FIELD SYSTEM / {BUILD_VERSION}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  identity: {
    alignItems: 'center',
  },
  overline: {
    marginTop: spacing.lg,
  },
  title: {
    marginTop: spacing.sm,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  line: {
    width: 190,
    height: 1,
    backgroundColor: palette.rust,
    marginVertical: spacing.lg,
  },
  restoration: {
    position: 'absolute',
    bottom: 96,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  restorationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  restorationPip: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.brass,
  },
  buildLabel: {
    position: 'absolute',
    bottom: spacing.xl,
  },
  registrationTop: {
    position: 'absolute',
    top: 34,
    left: 22,
    width: 28,
    height: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: palette.line,
  },
  registrationBottom: {
    position: 'absolute',
    bottom: 34,
    right: 22,
    width: 28,
    height: 28,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
  },
});
