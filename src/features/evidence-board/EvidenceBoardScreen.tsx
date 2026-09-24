import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { createInitialCasePlayerState } from '@/case-engine';
import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { EvidenceBoard } from './components/EvidenceBoard';

export function EvidenceBoardScreen() {
  // Rain against the window behind the wall of evidence.
  useAmbientBed('ambient-rain');
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const persistedState = useCaseSessionStore((state) =>
    activeCaseId ? state.sessions[activeCaseId] : undefined,
  );
  const definition = activeCaseId ? getCaseDefinition(activeCaseId) : undefined;
  const playerState =
    definition && (persistedState ?? createInitialCasePlayerState(definition));

  if (!definition || !playerState) {
    return (
      <Screen>
        <View style={styles.emptyHeader}>
          <TactilePressable
            accessibilityLabel="Close evidence board"
            hapticsEnabled={hapticsEnabled}
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons color={palette.paper} name="close" size={24} />
          </TactilePressable>
        </View>
        <View style={styles.empty}>
          <Ionicons color={palette.rust} name="albums-outline" size={44} />
          <AppText variant="mono" color={palette.rust}>BOARD / NO CASE CHANNEL</AppText>
          <AppText accessibilityRole="header" variant="display" color={palette.paper} style={styles.emptyTitle}>
            Evidence wall unavailable
          </AppText>
          <AppText variant="body" color={palette.paperMuted} style={styles.emptyCopy}>
            Select an authored case before opening the persistent evidence wall.
          </AppText>
          <TactilePressable
            accessibilityLabel="Open case library"
            accessibilityRole="button"
            hapticsEnabled={hapticsEnabled}
            onPress={() => router.replace('/case-library')}
            style={styles.libraryButton}
          >
            <AppText variant="label" color={palette.black}>OPEN CASE LIBRARY</AppText>
          </TactilePressable>
        </View>
      </Screen>
    );
  }

  if (playerState.phase === 'briefing') {
    return (
      <Screen>
        <View style={styles.emptyHeader}>
          <TactilePressable
            accessibilityLabel="Close evidence board"
            hapticsEnabled={hapticsEnabled}
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons color={palette.paper} name="close" size={24} />
          </TactilePressable>
        </View>
        <View style={styles.empty}>
          <Ionicons color={palette.brass} name="lock-closed-outline" size={42} />
          <AppText variant="mono" color={palette.brass}>BOARD / SEALED</AppText>
          <AppText accessibilityRole="header" variant="display" color={palette.paper} style={styles.emptyTitle}>
            Begin the investigation
          </AppText>
          <AppText variant="body" color={palette.paperMuted} style={styles.emptyCopy}>
            The evidence wall opens after the case brief is accepted and the first artifacts are recovered.
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <EvidenceBoard definition={definition} playerState={playerState} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyHeader: { height: 58, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: palette.line },
  closeButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyTitle: { textAlign: 'center' },
  emptyCopy: { maxWidth: 330, textAlign: 'center' },
  libraryButton: { minHeight: 52, marginTop: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.brass },
});
