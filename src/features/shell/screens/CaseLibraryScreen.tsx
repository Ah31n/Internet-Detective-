import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CASE_DEFINITIONS } from '@/case-content/caseRegistry';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { availabilityLabel, useCaseLibrary } from '@/core/commerce';
import { AppText } from '@/design-system/components/AppText';
import { GameButton } from '@/design-system/components/GameButton';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { revealIn, useReduceMotion } from '@/design-system/motion/motionSystem';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { EmptyInstrument } from '../components/EmptyInstrument';
import { ShellHeader } from '../components/ShellHeader';

export function CaseLibraryScreen() {
  // Still in the room: the drawer is only a few steps away.
  useAmbientBed('ambient-hotel-room');
  useRememberRoute('/case-library');
  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const activateCase = useCaseSessionStore((state) => state.activateCase);
  const motionEnabled = !useReduceMotion();
  // The archive lists the whole published season. What is *installed* is a
  // separate question, and the access layer answers it per row.
  const library = useCaseLibrary();
  const installedCount = library.filter((item) => item.status === 'playable').length;

  return (
    <Screen>
      <ShellHeader eyebrow="CASE LIBRARY" title="Encrypted local archive" />
      <View style={styles.archiveHeading}>
        <View>
          <AppText variant="mono" color={palette.rust}>
            ARCHIVE / LOCAL
          </AppText>
          <AppText accessibilityRole="header" variant="display" style={styles.title}>
            Case files
          </AppText>
        </View>
        <View style={styles.count}>
          <AppText variant="label" color={palette.paperMuted}>
            {String(installedCount).padStart(2, '0')} OF{' '}
            {String(library.length).padStart(2, '0')} INSTALLED
          </AppText>
        </View>
      </View>

      <View style={styles.archiveBody}>
        <View style={styles.indexRail}>
          {['A', 'F', 'K', 'P', 'U', 'Z'].map((letter) => (
            <AppText key={letter} variant="mono" color={palette.line}>
              {letter}
            </AppText>
          ))}
        </View>
        <View style={styles.fileArea}>
          {library.length === 0 ? (
            <EmptyInstrument
              code="ARCHIVE CLEAR"
              icon="folder-open-outline"
              message="No investigation dossier has been installed. Structured CaseDefinitions will enter through this archive."
              title="No case selected"
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {library.map((availability, index) => {
                const { entry, status } = availability;
                const definition = CASE_DEFINITIONS.find(
                  (item) => item.id === entry.definitionId,
                );
                const playable = status === 'playable' && definition !== undefined;
                const active = playable && activeCaseId === definition.id;

                return (
                  <Animated.View
                    entering={revealIn(motionEnabled, index)}
                    key={entry.id}
                  >
                    <TactilePressable
                      accessibilityHint={
                        playable
                          ? 'Open the structured case brief'
                          : 'Open the anthology for this case'
                      }
                      accessibilityLabel={`Case file ${entry.number}, ${entry.title}. ${availabilityLabel(status)}${active ? ', currently active' : ''}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      hapticsEnabled={hapticsEnabled}
                      onPress={() => {
                        if (playable) {
                          activateCase(definition);
                          router.push('/case-brief');
                          return;
                        }
                        // Nothing is hardcoded to a purchase state: an
                        // unavailable row simply defers to the anthology.
                        router.push('/anthology');
                      }}
                      pressedScale={0.99}
                      style={[
                        styles.fileRow,
                        active && styles.activeFileRow,
                        !playable && styles.sealedFileRow,
                      ]}
                    >
                      <AppText
                        variant="mono"
                        color={playable ? palette.rust : palette.line}
                      >
                        {entry.number}
                      </AppText>
                      <View style={styles.fileCopy}>
                        <AppText
                          variant="title"
                          color={playable ? palette.white : palette.paperMuted}
                          style={styles.fileTitle}
                        >
                          {entry.title}
                        </AppText>
                        <View style={styles.fileMeta}>
                          <Ionicons
                            color={playable ? palette.mossText : palette.paperMuted}
                            name={playable ? 'folder-open-outline' : 'time-outline'}
                            size={13}
                          />
                          <AppText
                            variant="mono"
                            color={playable ? palette.mossText : palette.paperMuted}
                          >
                            {availabilityLabel(status)}
                          </AppText>
                          {definition ? (
                            <AppText variant="mono" color={palette.paperMuted}>
                              · V{definition.contentVersion}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                      {active ? (
                        <AppText variant="label" color={palette.moss}>
                          ACTIVE
                        </AppText>
                      ) : (
                        <Ionicons
                          color={playable ? palette.paperMuted : palette.line}
                          name="chevron-forward"
                          size={18}
                        />
                      )}
                    </TactilePressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <GameButton
          hapticsEnabled={hapticsEnabled}
          onPress={() => router.push('/anthology')}
          tone="outline"
        >
          THE ANTHOLOGY
        </GameButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  archiveHeading: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: spacing.xs,
  },
  count: {
    paddingBottom: spacing.xs,
  },
  archiveBody: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  indexRail: {
    width: 42,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
  fileArea: {
    flex: 1,
  },
  fileRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  sealedFileRow: {
    backgroundColor: palette.ink,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: 3,
  },
  activeFileRow: {
    borderLeftWidth: 2,
    borderLeftColor: palette.brass,
    backgroundColor: palette.inkSoft,
  },
  fileCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  fileTitle: {
    fontSize: 21,
    lineHeight: 27,
  },
  footer: {
    padding: spacing.md,
  },
});
