import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { useCaseLibrary } from '@/core/commerce';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { BrandSeal } from '../components/BrandSeal';
import { DeskCaseFile, type CaseFileState } from '../components/DeskCaseFile';

/**
 * THE DESK
 *
 * PHASE 19 — redesigned after playing the game rather than reading it.
 *
 * What was here was a "DESK REGISTRY" listing "05 DESTINATIONS": five numbered
 * rows, each with an icon, a title, and a sentence of explanation, under a
 * green dot reading INVESTIGATION DESK ONLINE. Played cold, that is a site map
 * with a service-status indicator on top. A new player had to choose between
 * "Case library", "Case brief", and "Investigation room" before they knew what
 * any of them were, and nothing on the screen said *start*.
 *
 * Now there is one object on the desk — the case file — and one thing to do
 * with it, phrased for whatever state the investigation is actually in. The
 * other places are a single quiet line underneath, where a returning player
 * will look for them and a new player can ignore them.
 */
export function InvestigationHomeScreen() {
  // The room the detective works out of.
  useAmbientBed('ambient-hotel-room');
  useRememberRoute('/investigation-home');

  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const lastInvestigationRoute = useAppStore(
    (state) => state.lastInvestigationRoute,
  );

  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const sessions = useCaseSessionStore((state) => state.sessions);
  const activateCase = useCaseSessionStore((state) => state.activateCase);
  const library = useCaseLibrary();

  const desk = useMemo(() => {
    // The file on the desk is the one being worked, or the first one that can
    // be opened. Access is still the access layer's decision, not this
    // screen's.
    const playable = library.filter((item) => item.status === 'playable');
    const entry =
      playable.find((item) => item.entry.definitionId === activeCaseId) ??
      playable[0];
    if (!entry?.entry.definitionId) return null;

    const definition = getCaseDefinition(entry.entry.definitionId);
    if (!definition) return null;

    const session = sessions[definition.id];
    const total = definition.investigation.evidence.length;

    let state: CaseFileState = 'sealed';
    let statusLine = `SEALED · ${total} ARTIFACTS UNREAD`;

    if (session?.resolution) {
      state = 'closed';
      statusLine = `CLOSED · VERDICT ${session.resolution.score} OF 100`;
    } else if (session && session.phase !== 'briefing') {
      state = 'open';
      const found = session.discoveredEvidenceIds.length;
      const proven = session.solvedDeductionIds.length;
      statusLine = `${found} OF ${total} ARTIFACTS RECOVERED · ${proven} DEDUCTION${
        proven === 1 ? '' : 'S'
      } PROVEN`;
    } else if (session) {
      state = 'briefed';
      statusLine = 'BRIEF AWAITING REVIEW';
    }

    return { definition, state, statusLine, entry };
  }, [activeCaseId, library, sessions]);

  const openCaseFile = () => {
    if (!desk) return;
    if (desk.state === 'sealed' || desk.state === 'briefed') {
      activateCase(desk.definition);
      router.push('/case-brief');
      return;
    }
    if (desk.state === 'closed') {
      router.push('/investigation');
      return;
    }
    router.push(lastInvestigationRoute);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masthead}>
          <View style={styles.brandRow}>
            <BrandSeal />
            <View>
              <AppText variant="label" color={palette.brass}>
                INTERNET DETECTIVE
              </AppText>
              <AppText variant="mono" color={palette.paperMuted}>
                FIELD DESK
              </AppText>
            </View>
          </View>
          <TactilePressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            hapticsEnabled={hapticsEnabled}
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Ionicons color={palette.paper} name="settings-outline" size={23} />
          </TactilePressable>
        </View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(420)}
        >
          {desk ? (
            <DeskCaseFile
              classification={desk.definition.brief.classification}
              hapticsEnabled={hapticsEnabled}
              number={desk.entry.entry.number}
              onPress={openCaseFile}
              state={desk.state}
              statusLine={desk.statusLine}
              title={desk.entry.entry.title}
            />
          ) : (
            <View style={styles.noFile}>
              <AppText variant="mono" color={palette.rust}>
                DESK CLEAR
              </AppText>
              <AppText variant="body" color={palette.paperMuted}>
                No case file is installed on this device.
              </AppText>
            </View>
          )}
        </Animated.View>

        {/* Everything else, at the weight it deserves: one quiet line. */}
        <View style={styles.elsewhere}>
          <DeskLink
            hapticsEnabled={hapticsEnabled}
            label="ARCHIVE"
            onPress={() => router.push('/case-library')}
          />
          <View style={styles.divider} />
          <DeskLink
            hapticsEnabled={hapticsEnabled}
            label="RECORD"
            onPress={() => router.push('/profile')}
          />
          <View style={styles.divider} />
          <DeskLink
            hapticsEnabled={hapticsEnabled}
            label="ANTHOLOGY"
            onPress={() => router.push('/anthology')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function DeskLink({
  hapticsEnabled,
  label,
  onPress,
}: {
  hapticsEnabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TactilePressable
      accessibilityLabel={label.toLowerCase()}
      accessibilityRole="button"
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      style={styles.deskLink}
    >
      <AppText variant="mono" color={palette.paperMuted}>
        {label}
      </AppText>
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  masthead: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noFile: {
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  elsewhere: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  deskLink: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: palette.line,
  },
});
