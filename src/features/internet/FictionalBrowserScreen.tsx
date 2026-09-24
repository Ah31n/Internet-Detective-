import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createFictionalPageKey,
  getAvailableFictionalSites,
  getFictionalPage,
  getFictionalSite,
  type FictionalPageLink,
} from '@/case-engine';
import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { FictionalSitePage } from './components/FictionalSitePage';

export function FictionalBrowserScreen() {
  useAmbientBed('ambient-electronic-hum');
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ siteId: string; pageId: string }>();
  const siteId = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
  const pageId = Array.isArray(params.pageId) ? params.pageId[0] : params.pageId;
  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const definition = activeCaseId ? getCaseDefinition(activeCaseId) : undefined;
  const playerState = useCaseSessionStore((state) =>
    activeCaseId ? state.sessions[activeCaseId] : undefined,
  );
  const dispatchCaseAction = useCaseSessionStore(
    (state) => state.dispatchCaseAction,
  );

  const site = useMemo(
    () => (definition && siteId ? getFictionalSite(definition, siteId) : undefined),
    [definition, siteId],
  );
  const page = useMemo(
    () =>
      definition && siteId && pageId
        ? getFictionalPage(definition, { siteId, pageId })
        : undefined,
    [definition, pageId, siteId],
  );

  useEffect(() => {
    if (!activeCaseId || !siteId || !pageId || !playerState || !definition) return;
    const current = playerState.fictionalInternet.currentLocation;
    if (current?.siteId === siteId && current?.pageId === pageId) return;
    dispatchCaseAction(definition, {
      type: 'OPEN_INTERNET_PAGE',
      siteId,
      pageId,
    });
  }, [
    activeCaseId,
    definition,
    dispatchCaseAction,
    pageId,
    playerState,
    siteId,
  ]);

  const siteIsAvailable = Boolean(
    definition &&
      playerState &&
      playerState.phase !== 'briefing' &&
      site &&
      getAvailableFictionalSites(definition, playerState).some(
        (candidate) => candidate.id === site.id,
      ),
  );

  if (
    !activeCaseId ||
    !definition ||
    !playerState ||
    !site ||
    !page ||
    !siteIsAvailable
  ) {
    return (
      <View style={[styles.unavailable, { paddingTop: insets.top + spacing.lg }]}>
        <Ionicons color={palette.brass} name="cloud-offline-outline" size={36} />
        <AppText variant="title" color={palette.paper}>NODE UNAVAILABLE</AppText>
        <AppText variant="bodySmall" color={palette.paperMuted} style={styles.centerText}>
          This location is not present in the active case archive.
        </AppText>
        <TactilePressable
          accessibilityLabel="Return to the case network index"
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          onPress={() => router.replace('/investigation/internet')}
          style={styles.returnButton}
        >
          <AppText variant="label" color={palette.ink}>RETURN TO CASE NET</AppText>
        </TactilePressable>
      </View>
    );
  }

  const internetState = playerState.fictionalInternet;
  const pageKey = createFictionalPageKey(site.id, page.id);
  const isBookmarked = internetState.bookmarkedPageKeys.includes(pageKey);
  const canGoBack = internetState.historyIndex > 0;
  const canGoForward =
    internetState.historyIndex >= 0 &&
    internetState.historyIndex < internetState.history.length - 1;

  const navigateToCurrentEngineLocation = () => {
    const next = useCaseSessionStore.getState().sessions[activeCaseId]?.fictionalInternet
      .currentLocation;
    if (!next) return;
    router.replace({
      pathname: '/internet/[siteId]/[pageId]',
      params: { siteId: next.siteId, pageId: next.pageId },
    });
  };

  const openLink = (link: FictionalPageLink) => {
    dispatchCaseAction(definition, {
      type: 'OPEN_INTERNET_PAGE',
      siteId: link.targetSiteId,
      pageId: link.targetPageId,
    });
    navigateToCurrentEngineLocation();
  };

  return (
    <View style={styles.root}>
      <View style={[styles.chrome, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.toolRow}>
          <ToolButton
            accessibilityLabel="Close Case Net"
            hapticsEnabled={hapticsEnabled}
            icon="close"
            onPress={() => router.replace('/investigation/internet')}
          />
          <View style={styles.historyTools}>
            <ToolButton
              accessibilityLabel="Previous local page"
              disabled={!canGoBack}
              hapticsEnabled={hapticsEnabled}
              icon="chevron-back"
              onPress={() => {
                dispatchCaseAction(definition, { type: 'INTERNET_BACK' });
                navigateToCurrentEngineLocation();
              }}
            />
            <ToolButton
              accessibilityLabel="Next local page"
              disabled={!canGoForward}
              hapticsEnabled={hapticsEnabled}
              icon="chevron-forward"
              onPress={() => {
                dispatchCaseAction(definition, { type: 'INTERNET_FORWARD' });
                navigateToCurrentEngineLocation();
              }}
            />
          </View>
          <View style={styles.caseNetBrand}>
            <AppText variant="label" color={palette.brass}>CASE NET</AppText>
            <View style={styles.localStatus}>
              <View style={styles.statusPip} />
              <AppText variant="mono" color={palette.paperMuted}>LOCAL / OFFLINE</AppText>
            </View>
          </View>
          <ToolButton
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark page'}
            hapticsEnabled={hapticsEnabled}
            icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            onPress={() =>
              dispatchCaseAction(definition, {
                type: 'SET_INTERNET_PAGE_BOOKMARKED',
                siteId: site.id,
                pageId: page.id,
                bookmarked: !isBookmarked,
              })
            }
            selected={isBookmarked}
          />
          <ToolButton
            accessibilityLabel="Open local index"
            hapticsEnabled={hapticsEnabled}
            icon="search"
            onPress={() => router.replace('/investigation/internet')}
          />
        </View>
        <View style={styles.locationStrip}>
          <Ionicons color={palette.brass} name="shield-checkmark" size={14} />
          <View style={styles.locationCopy}>
            <AppText variant="mono" color={palette.paper} numberOfLines={1}>
              {site.identity.fictionalHost}
            </AppText>
            <AppText variant="mono" color={palette.paperMuted} numberOfLines={1}>
              {page.path}
            </AppText>
          </View>
          <AppText variant="mono" color={palette.paperMuted}>ARCHIVED NODE</AppText>
        </View>
      </View>

      <FictionalSitePage
        hapticsEnabled={hapticsEnabled}
        onOpenLink={openLink}
        page={page}
        site={site}
      />
    </View>
  );
}

interface ToolButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  hapticsEnabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  selected?: boolean;
}

function ToolButton({
  accessibilityLabel,
  disabled = false,
  hapticsEnabled,
  icon,
  onPress,
  selected = false,
}: ToolButtonProps) {
  return (
    <TactilePressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      style={[styles.toolButton, disabled && styles.toolButtonDisabled]}
    >
      <Ionicons
        color={selected ? palette.brass : palette.paper}
        name={icon}
        size={21}
      />
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  chrome: { backgroundColor: palette.charcoal, borderBottomWidth: 1, borderBottomColor: palette.line },
  toolRow: { minHeight: 52, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  historyTools: { flexDirection: 'row' },
  caseNetBrand: { flex: 1, alignItems: 'center' },
  localStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusPip: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.moss },
  toolButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  toolButtonDisabled: { opacity: 0.25 },
  locationStrip: { height: 43, marginHorizontal: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.ink },
  locationCopy: { flex: 1 },
  unavailable: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: palette.ink },
  centerText: { textAlign: 'center' },
  returnButton: { marginTop: spacing.sm, minHeight: 50, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.brass },
});
