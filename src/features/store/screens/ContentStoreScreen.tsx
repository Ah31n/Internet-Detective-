import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAmbientBed } from '@/core/audio/useGameAudio';
import { useAnthology, useCaseLibrary } from '@/core/commerce';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';
import { CASE_DEFINITIONS } from '@/case-content/caseRegistry';

import { ShellHeader } from '../../shell/components/ShellHeader';
import { BoundVolume } from '../components/BoundVolume';
import { ContentsEntry } from '../components/ContentsEntry';

/**
 * THE ANTHOLOGY
 *
 * The store, and it is a *published series*, not a shop: a masthead, a
 * contents page, and a shelf of bound volumes. What a reader meets in a good
 * mystery anthology — the promise of the collection, stated once, quietly.
 *
 * Things this screen deliberately has none of: a cart, a grid of tiles, a
 * pricing table, a "most popular" flag, a discount, a countdown, a consumable,
 * or any second attempt to sell after the first has been declined.
 */
export function ContentStoreScreen() {
  useAmbientBed('ambient-hotel-room');
  useRememberRoute('/anthology');

  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const library = useCaseLibrary();
  const activateCase = useCaseSessionStore((state) => state.activateCase);

  // One domain object instead of nine slices of persistence. The screen knows
  // what an anthology has; it does not know how ownership is stored.
  const anthology = useAnthology();
  const { busy, message, phase, shelf } = anthology;

  useEffect(() => {
    if (!anthology.productsLoaded) anthology.loadProducts();
  }, [anthology]);

  const volumes = shelf.filter((entry) => entry.product.kind !== 'case');

  const openCase = (definitionId: string | null) => {
    const definition = CASE_DEFINITIONS.find((item) => item.id === definitionId);
    if (!definition) return;
    activateCase(definition);
    router.push('/case-brief');
  };

  return (
    <Screen>
      <ShellHeader eyebrow="THE ANTHOLOGY" title="An imprint of investigations" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masthead}>
          <View style={styles.ruleStrong} />
          <AppText variant="mono" color={palette.rustText} style={styles.imprint}>
            INTERNET DETECTIVE · AN ANTHOLOGY
          </AppText>
          <AppText accessibilityRole="header" variant="display" style={styles.mastheadTitle}>
            SEASON ONE
          </AppText>
          <AppText variant="body" color={palette.paperMuted} style={styles.standfirst}>
            Six self-contained investigations. Each one is written, evidenced,
            and solvable on its own terms. The first is included with the app.
          </AppText>
          <View style={styles.ruleStrong} />
        </View>

        <View style={styles.sectionHead}>
          <AppText accessibilityRole="header" variant="label">
            CONTENTS
          </AppText>
          <AppText variant="mono" color={palette.paperMuted}>
            {String(library.length).padStart(2, '0')} CASES
          </AppText>
        </View>

        {library.map((availability) => (
          <ContentsEntry
            availability={availability}
            hapticsEnabled={hapticsEnabled}
            key={availability.entry.id}
            onPress={
              availability.status === 'playable'
                ? () => openCase(availability.entry.definitionId)
                : undefined
            }
          />
        ))}

        <View style={styles.sectionHead}>
          <AppText accessibilityRole="header" variant="label">
            COLLECTED EDITIONS
          </AppText>
          <AppText variant="mono" color={palette.paperMuted}>
            BOUGHT ONCE
          </AppText>
        </View>

        {volumes.map((entry) => (
          <BoundVolume
            busy={busy}
            entry={entry}
            hapticsEnabled={hapticsEnabled}
            key={entry.product.id}
            onAcquire={() => anthology.purchase(entry.product.id)}
          />
        ))}

        {message ? (
          <View accessibilityLiveRegion="polite" style={styles.messageRow}>
            <Ionicons color={palette.brass} name="information-circle-outline" size={16} />
            <AppText variant="bodySmall" color={palette.paper}>
              {message}
            </AppText>
          </View>
        ) : null}

        <TactilePressable
          accessibilityHint="Recovers editions bought on this account"
          accessibilityLabel="Restore a previous purchase"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          hapticsEnabled={hapticsEnabled}
          onPress={() => anthology.restore()}
          style={styles.restore}
        >
          <AppText variant="mono" color={palette.paperMuted}>
            {phase === 'restoring' ? 'RESTORING…' : 'RESTORE A PREVIOUS PURCHASE'}
          </AppText>
        </TactilePressable>

        {/* The house rules, printed where a colophon would be. */}
        <View style={styles.charter}>
          <View style={styles.rule} />
          <AppText variant="label" color={palette.paperMuted} style={styles.charterHead}>
            HOW THIS SERIES IS SOLD
          </AppText>
          {[
            'Case 001 is free, complete, and permanent.',
            'Every case is bought once and owned for good.',
            'No advertising, no energy, no lives, no loot boxes, no timers.',
            'Nothing you own can expire, and nothing renews.',
          ].map((line) => (
            <View key={line} style={styles.charterLine}>
              <AppText variant="mono" color={palette.rustText}>
                ·
              </AppText>
              <AppText variant="bodySmall" color={palette.paperMuted} style={styles.charterCopy}>
                {line}
              </AppText>
            </View>
          ))}

          {anthology.isDevelopmentBilling ? (
            <View style={styles.devNotice}>
              <Ionicons color={palette.rustText} name="construct-outline" size={15} />
              <AppText variant="mono" color={palette.rustText} style={styles.devCopy}>
                DEVELOPMENT BILLING · MOCK ADAPTER · NOTHING IS CHARGED
              </AppText>
            </View>
          ) : (
            <View style={styles.devNotice}>
              <Ionicons color={palette.paperMuted} name="lock-closed-outline" size={15} />
              <AppText variant="mono" color={palette.paperMuted} style={styles.devCopy}>
                ACQUISITION IS NOT OPEN ON THIS BUILD
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  masthead: {
    paddingTop: spacing.md,
  },
  ruleStrong: {
    height: 1,
    backgroundColor: palette.lineStrong,
  },
  rule: {
    height: 1,
    backgroundColor: palette.line,
  },
  imprint: {
    paddingTop: spacing.xs,
  },
  mastheadTitle: {
    paddingVertical: spacing.xxs,
    letterSpacing: 1,
  },
  standfirst: {
    paddingBottom: spacing.md,
    maxWidth: 400,
  },
  sectionHead: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  restore: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  charter: {
    marginTop: spacing.lg,
  },
  charterHead: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  charterLine: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 3,
  },
  charterCopy: {
    flex: 1,
  },
  devNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
  devCopy: {
    flex: 1,
  },
});
