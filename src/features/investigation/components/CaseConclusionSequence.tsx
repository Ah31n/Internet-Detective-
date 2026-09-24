/* Reanimated shared values are intentionally mutated inside effects. */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { InvestigationViewModel } from '@/case-engine';
import { playCue } from '@/core/audio/audioEngine';
import { completionFeedback } from '@/core/feedback/haptics';
import { AppText } from '@/design-system/components/AppText';
import { GameButton } from '@/design-system/components/GameButton';
import {
  curve,
  duration,
  revealIn,
  settleIn,
  useReduceMotion,
  useStagedSequence,
} from '@/design-system/motion/motionSystem';
import { motion, palette, spacing } from '@/design-system/theme/tokens';

/**
 * THE CONCLUSION
 *
 * The case does not end with a score popping onto the screen. It ends the way
 * a detective closes a file: the theory is stated, the theory is confirmed,
 * the evidence that carried it is laid out, the night is reconstructed in
 * order, the explanation is read, and only then is the file stamped.
 *
 * Five held stages, one per beat. No celebration, no loops, no arcade. Under
 * reduced motion the whole report is simply present at once.
 */

const STAGE_CONFIRMATION = 1;
const STAGE_MONTAGE = 2;
const STAGE_RECONSTRUCTION = 3;
const STAGE_REPORT = 4;
const STAGE_COUNT = 5;
const STAGE_HOLD_MS = 820;

/** The montage is a sample of the case, not an inventory dump. */
const MONTAGE_LIMIT = 6;

export function CaseConclusionSequence({
  hapticsEnabled,
  view,
}: {
  hapticsEnabled: boolean;
  view: InvestigationViewModel;
}) {
  const reduceMotion = useReduceMotion();
  const motionEnabled = !reduceMotion;
  const stage = useStagedSequence(STAGE_COUNT, STAGE_HOLD_MS, motionEnabled);
  const resolution = view.resolution;

  const montage = view.discoveredEvidence
    .filter((evidence) => evidence.usedInTheory || evidence.referenced)
    .slice(0, MONTAGE_LIMIT);
  const montageItems =
    montage.length > 0
      ? montage
      : view.discoveredEvidence.slice(0, MONTAGE_LIMIT);

  // One restrained note when the file is stamped. Nothing else makes a sound.
  // The cue's own cooldown keeps this from doubling with the transition that
  // resolved the case a few seconds earlier.
  useEffect(() => {
    if (stage < STAGE_REPORT) return;
    completionFeedback(hapticsEnabled);
    playCue('completion-case-closed', { priority: 'significant' });
  }, [hapticsEnabled, stage]);

  if (!resolution) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Animated.View entering={revealIn(motionEnabled)}>
        <AppText variant="mono" color={palette.rust}>
          THEORY
        </AppText>
        <AppText variant="title" style={styles.line}>
          {view.accusation?.title ?? 'Final accusation submitted'}
        </AppText>
        <AppText variant="bodySmall" color={palette.paperMuted}>
          {view.progress.solvedDeductions}/{view.progress.totalDeductions}{' '}
          DEDUCTIONS PROVEN ·{' '}
          {view.progress.discoveredEvidence}/{view.progress.totalEvidence}{' '}
          EVIDENCE RECOVERED
        </AppText>
      </Animated.View>

      {stage >= STAGE_CONFIRMATION ? (
        <Animated.View entering={settleIn(motionEnabled)} style={styles.block}>
          <View style={styles.confirmationRule} />
          <AppText variant="mono" color={palette.moss}>
            CONFIRMATION
          </AppText>
          <AppText variant="display" style={styles.line}>
            {resolution.headline}
          </AppText>
          <AppText variant="mono" color={palette.paperMuted}>
            SCORE {resolution.score}/{resolution.maximumScore}
          </AppText>
        </Animated.View>
      ) : null}

      {stage >= STAGE_MONTAGE ? (
        <Animated.View entering={revealIn(motionEnabled)} style={styles.block}>
          <AppText variant="label" color={palette.paperMuted}>
            EVIDENCE THAT CARRIED IT
          </AppText>
          {montageItems.map((evidence, index) => (
            <Animated.View
              entering={revealIn(motionEnabled, index)}
              key={evidence.id}
              style={styles.montageRow}
            >
              <View style={styles.montageMark} />
              <View style={styles.montageCopy}>
                <AppText variant="body" numberOfLines={1}>
                  {evidence.title}
                </AppText>
                <AppText variant="mono" color={palette.paperMuted}>
                  {evidence.type.toUpperCase()}
                </AppText>
              </View>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      {stage >= STAGE_RECONSTRUCTION && view.knownTimeline.length > 0 ? (
        <Animated.View entering={revealIn(motionEnabled)} style={styles.block}>
          <AppText variant="label" color={palette.paperMuted}>
            THE NIGHT, IN ORDER
          </AppText>
          {view.knownTimeline.map((event, index) => (
            <Animated.View
              entering={settleIn(motionEnabled, index)}
              key={event.id}
              style={styles.reconstructionRow}
            >
              <AppText variant="mono" color={palette.brass}>
                {event.timeLabel}
              </AppText>
              <AppText
                variant="bodySmall"
                color={palette.paper}
                style={styles.reconstructionCopy}
              >
                {event.title}
              </AppText>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      {stage >= STAGE_REPORT ? (
        <Animated.View entering={revealIn(motionEnabled)} style={styles.block}>
          <AppText variant="label" color={palette.rust}>
            CASE REPORT
          </AppText>
          <AppText variant="body" color={palette.paperMuted} style={styles.line}>
            {resolution.summary}
          </AppText>
          <ClosingStamp enabled={motionEnabled} />
          <GameButton
            hapticsEnabled={hapticsEnabled}
            onPress={() => router.push('/board')}
            tone="outline"
          >
            OPEN EVIDENCE BOARD
          </GameButton>
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}

/** The stamp lands on the file: it comes down, it does not bounce. */
function ClosingStamp({ enabled }: { enabled: boolean }) {
  const press = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) return;
    press.value = withTiming(1, {
      duration: duration.brief,
      easing: curve.recede,
    });
  }, [enabled, press]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: press.value,
    transform: [
      { rotateZ: '-3.5deg' },
      { scale: 1.35 - press.value * 0.35 },
    ],
  }));

  const settleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1, motion.settle) }],
  }));

  return (
    <Animated.View style={[styles.stampWrap, settleStyle]}>
      <Animated.View style={[styles.stamp, stampStyle]}>
        <AppText variant="label" color={palette.rust}>
          CASE CLOSED
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  block: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  line: {
    marginVertical: spacing.xs,
  },
  confirmationRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.line,
    marginBottom: spacing.sm,
  },
  montageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  montageMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.brass,
    marginRight: spacing.sm,
  },
  montageCopy: {
    flex: 1,
  },
  reconstructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: spacing.sm,
  },
  reconstructionCopy: {
    flex: 1,
  },
  stampWrap: {
    alignSelf: 'flex-start',
    marginVertical: spacing.md,
  },
  stamp: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 3,
    borderColor: palette.rust,
  },
});
