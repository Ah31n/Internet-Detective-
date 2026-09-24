import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { createInitialCasePlayerState } from '@/case-engine';
import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { GameButton } from '@/design-system/components/GameButton';
import { Screen } from '@/design-system/components/Screen';
import {
  curve,
  duration as motionDuration,
  revealIn,
  settleIn,
} from '@/design-system/motion/motionSystem';
import { palette, radius, spacing } from '@/design-system/theme/tokens';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { BrandSeal } from '../components/BrandSeal';
import { ShellHeader } from '../components/ShellHeader';

export function CaseBriefScreen() {
  // The brief is read at the same desk.
  useAmbientBed('ambient-hotel-room');
  useRememberRoute('/case-brief');
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const persistedState = useCaseSessionStore((state) =>
    activeCaseId ? state.sessions[activeCaseId] : undefined,
  );
  const dispatchCaseAction = useCaseSessionStore(
    (state) => state.dispatchCaseAction,
  );
  const definition = activeCaseId
    ? getCaseDefinition(activeCaseId)
    : undefined;
  const playerState = definition
    ? (persistedState ?? createInitialCasePlayerState(definition))
    : undefined;

  const motionEnabled = !reduceMotion;
  // The dossier itself: it lands on the desk, and later closes into the
  // investigation rather than being replaced by it.
  const paperOpacity = useSharedValue(motionEnabled ? 0 : 1);
  const paperShift = useSharedValue(motionEnabled ? 14 : 0);
  const paperScale = useSharedValue(motionEnabled ? 1.015 : 1);
  const paperTilt = useSharedValue(motionEnabled ? -1.7 : -0.4);

  useEffect(() => {
    const settle = motionEnabled ? motionDuration.cinematic : 0;
    paperOpacity.value = withTiming(1, {
      duration: motionEnabled ? motionDuration.reveal : 0,
      easing: curve.emerge,
    });
    paperShift.value = withTiming(0, { duration: settle, easing: curve.emerge });
    paperScale.value = withTiming(1, { duration: settle, easing: curve.emerge });
    paperTilt.value = withTiming(-0.4, { duration: settle, easing: curve.settle });
  }, [motionEnabled, paperOpacity, paperScale, paperShift, paperTilt]);

  const paperStyle = useAnimatedStyle(() => ({
    opacity: paperOpacity.value,
    transform: [
      { translateY: paperShift.value },
      { scale: paperScale.value },
      { rotateZ: `${paperTilt.value}deg` },
    ],
  }));

  const enterInvestigation = () => {
    if (!definition || !playerState) {
      router.replace('/case-library');
      return;
    }

    if (playerState.phase === 'briefing') {
      const result = dispatchCaseAction(definition, {
        type: 'BEGIN_INVESTIGATION',
      });
      if (!result.ok) return;
    }

    if (!motionEnabled) {
      router.push('/investigation');
      return;
    }

    // Continuity: the brief closes and hands off, it does not cut away.
    // Reanimated shared values are mutable by design; the compiler lint cannot
    // distinguish them from React state, so the write is narrowly allowed here.
    // eslint-disable-next-line react-hooks/immutability
    paperScale.value = withTiming(0.985, {
      duration: motionDuration.brief,
      easing: curve.recede,
    });
    // eslint-disable-next-line react-hooks/immutability
    paperOpacity.value = withTiming(0.45, {
      duration: motionDuration.brief,
      easing: curve.recede,
    });
    setTimeout(() => router.push('/investigation'), motionDuration.brief - 40);
  };

  return (
    <Screen>
      <ShellHeader
        eyebrow="BRIEFING ROOM"
        title={definition?.metadata.title ?? 'Restricted case mandate'}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <Animated.View style={[styles.dossier, paperStyle]}>
          {/* Metadata band: appears after the file has landed. */}
          <Animated.View entering={revealIn(motionEnabled, 3)} style={styles.dossierHeader}>
            <BrandSeal muted size={38} />
            <View style={styles.classification}>
              <AppText variant="mono" color={palette.rustInk}>
                CLASSIFICATION
              </AppText>
              <AppText variant="label" color={palette.ink}>
                {definition?.metadata.classification ?? 'UNASSIGNED'}
              </AppText>
            </View>
            <AppText variant="mono" color={palette.rustInk}>
              V{definition?.contentVersion ?? '—'}
            </AppText>
          </Animated.View>

          {/* The case number is the anchor: it never moves or animates. */}
          <View style={styles.fileNumber}>
            <AppText variant="mono" color={palette.rustInk}>
              CASE FILE
            </AppText>
            <AppText variant="title" color={palette.ink}>
              {definition?.id.toUpperCase() ?? '———'}
            </AppText>
          </View>

          <View style={styles.paperRule} />
          {/* Title emerges from the file, then the narrative behind it. */}
          <Animated.View entering={settleIn(motionEnabled, 1)}>
            <AppText variant="title" color={palette.ink}>
              {definition?.metadata.title ?? 'No active dossier'}
            </AppText>
          </Animated.View>
          <Animated.View entering={revealIn(motionEnabled, 4)}>
            <AppText variant="body" color={palette.inkSoft} style={styles.explanation}>
              {definition?.brief.summary ??
                'Select an installed CaseDefinition from the library before beginning a formal briefing.'}
            </AppText>
          </Animated.View>

          <View style={styles.objectiveField}>
            <AppText variant="label" color={palette.rustInk}>
              INVESTIGATIVE MANDATE
            </AppText>
            {definition ? (
              definition.brief.objectives.map((objective, index) => (
                <Animated.View
                  entering={revealIn(motionEnabled, 5 + index)}
                  key={objective.id}
                  style={styles.objectiveRow}
                >
                  <AppText variant="mono" color={palette.rustInk}>
                    {String(index + 1).padStart(2, '0')}
                  </AppText>
                  <AppText variant="bodySmall" color={palette.ink} style={styles.objectiveCopy}>
                    {objective.text}
                  </AppText>
                </Animated.View>
              ))
            ) : (
              <>
                <View style={styles.blankLine} />
                <View style={styles.blankLine} />
                <View style={[styles.blankLine, styles.shortLine]} />
              </>
            )}
          </View>

          <Animated.View entering={revealIn(motionEnabled, 8)} style={styles.stamp}>
            <AppText variant="label" color={palette.rustInk}>
              {definition ? playerState?.phase.toUpperCase() : 'AWAITING FILE'}
            </AppText>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      <View style={styles.actions}>
        <GameButton
          accessibilityLabel={
            definition
              ? playerState?.phase === 'briefing'
                ? 'Begin investigation'
                : 'Continue investigation'
              : 'Choose a case file'
          }
          hapticsEnabled={hapticsEnabled}
          onPress={enterInvestigation}
        >
          {definition
            ? playerState?.phase === 'briefing'
              ? 'BEGIN INVESTIGATION'
              : 'CONTINUE INVESTIGATION'
            : 'CHOOSE A CASE FILE'}
        </GameButton>
        <GameButton
          hapticsEnabled={hapticsEnabled}
          onPress={() => router.replace('/case-library')}
          tone="quiet"
        >
          RETURN TO LIBRARY
        </GameButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  dossier: {
    minHeight: 480,
    padding: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: palette.paper,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 9,
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classification: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  fileNumber: {
    marginTop: spacing.xl,
  },
  paperRule: {
    height: 2,
    backgroundColor: palette.rust,
    marginVertical: spacing.lg,
  },
  explanation: {
    marginTop: spacing.sm,
    maxWidth: 310,
  },
  objectiveField: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  objectiveRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.paperMuted,
  },
  objectiveCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  blankLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.paperMuted,
  },
  shortLine: {
    width: '68%',
  },
  stamp: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    transform: [{ rotate: '-7deg' }],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: palette.rust,
    opacity: 0.78,
  },
  actions: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
});
