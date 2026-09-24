import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  createFictionalPageKey,
  getAvailableFictionalSites,
  getFictionalPage,
  getFictionalSite,
  searchFictionalInternet,
  type FictionalInternetLocation,
  type FictionalSiteDefinition,
} from '@/case-engine';
import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

interface IndexResult {
  location: FictionalInternetLocation;
  title: string;
  excerpt: string;
  site: FictionalSiteDefinition;
}

type IndexMode = 'index' | 'bookmarks' | 'history';

export function FictionalInternetIndexScreen() {
  useAmbientBed('ambient-electronic-hum');
  useRememberRoute('/investigation/internet');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<IndexMode>('index');
  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const playerState = useCaseSessionStore((state) =>
    activeCaseId ? state.sessions[activeCaseId] : undefined,
  );
  const dispatchCaseAction = useCaseSessionStore(
    (state) => state.dispatchCaseAction,
  );
  const definition = activeCaseId ? getCaseDefinition(activeCaseId) : undefined;

  const results = useMemo<readonly IndexResult[]>(() => {
    if (!definition || !playerState) return [];

    if (query.trim()) {
      return searchFictionalInternet(definition, playerState, query).map((result) => ({
        location: { siteId: result.siteId, pageId: result.pageId },
        title: result.title,
        excerpt: result.description,
        site: getFictionalSite(definition, result.siteId)!,
      }));
    }

    if (mode === 'history') {
      return [...playerState.fictionalInternet.history]
        .reverse()
        .flatMap((location) => {
          const site = getFictionalSite(definition, location.siteId);
          const page = getFictionalPage(definition, location);
          return site && page
            ? [{ location, title: page.title, excerpt: page.description, site }]
            : [];
        });
    }

    if (mode === 'bookmarks') {
      return definition.investigation.internet.sites.flatMap((site) =>
        site.pages.flatMap((page) =>
          playerState.fictionalInternet.bookmarkedPageKeys.includes(
            createFictionalPageKey(site.id, page.id),
          )
            ? [
                {
                  location: { siteId: site.id, pageId: page.id },
                  title: page.title,
                  excerpt: page.description,
                  site,
                },
              ]
            : [],
        ),
      );
    }

    return getAvailableFictionalSites(definition, playerState).map((site) => {
      const page = site.pages.find((candidate) => candidate.id === site.homePageId)!;
      return {
        location: { siteId: site.id, pageId: page.id },
        title: page.title,
        excerpt: site.identity.tagline,
        site,
      };
    });
  }, [definition, mode, playerState, query]);

  const openResult = (result: IndexResult) => {
    if (!activeCaseId) return;
    if (!definition) return;
    dispatchCaseAction(definition, {
      type: 'OPEN_INTERNET_PAGE',
      siteId: result.location.siteId,
      pageId: result.location.pageId,
    });
    const current = useCaseSessionStore.getState().sessions[activeCaseId]?.fictionalInternet
      .currentLocation;
    if (
      current?.siteId !== result.location.siteId ||
      current.pageId !== result.location.pageId
    ) {
      return;
    }
    router.push({
      pathname: '/internet/[siteId]/[pageId]',
      params: {
        siteId: result.location.siteId,
        pageId: result.location.pageId,
      },
    });
  };

  const hasCaseInternet =
    definition && definition.investigation.internet.sites.length > 0 && playerState;
  const investigationStarted = playerState && playerState.phase !== 'briefing';

  return (
    <Screen edges={['top', 'right', 'left']}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View>
            <View style={styles.eyebrowRow}>
              <View style={styles.statusPip} />
              <AppText variant="mono" color={palette.brass}>OFFLINE CASE NETWORK</AppText>
            </View>
            <AppText accessibilityRole="header" variant="display" color={palette.paper}>CASE NET</AppText>
          </View>
          <View style={styles.archiveSeal}>
            <Ionicons color={palette.brass} name="shield-checkmark" size={20} />
            <AppText variant="mono" color={palette.paperMuted}>LOCAL{`\n`}ONLY</AppText>
          </View>
        </View>

        <View style={styles.searchField}>
          <Ionicons color={palette.paperMuted} name="search" size={20} />
          <TextInput
            accessibilityLabel="Search the local case index"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="SEARCH ARCHIVED NAMES, PLACES, TERMS"
            placeholderTextColor={palette.paperMuted}
            returnKeyType="search"
            selectionColor={palette.brass}
            style={styles.input}
            value={query}
          />
          {query ? (
            <TactilePressable
              accessibilityLabel="Clear search"
              hapticsEnabled={hapticsEnabled}
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <Ionicons color={palette.paper} name="close-circle" size={20} />
            </TactilePressable>
          ) : null}
        </View>

        <View style={styles.modeBar}>
          <ModeButton
            active={mode === 'index'}
            hapticsEnabled={hapticsEnabled}
            icon="grid-outline"
            label="INDEX"
            onPress={() => { setMode('index'); setQuery(''); }}
          />
          <ModeButton
            active={mode === 'bookmarks'}
            hapticsEnabled={hapticsEnabled}
            icon="bookmark-outline"
            label="SAVED"
            onPress={() => { setMode('bookmarks'); setQuery(''); }}
          />
          <ModeButton
            active={mode === 'history'}
            hapticsEnabled={hapticsEnabled}
            icon="time-outline"
            label="HISTORY"
            onPress={() => { setMode('history'); setQuery(''); }}
          />
        </View>

        <View style={styles.resultMeta}>
          <AppText variant="mono" color={palette.paperMuted}>
            {query ? 'INDEX MATCHES' : mode.toUpperCase()} / {results.length.toString().padStart(2, '0')}
          </AppText>
          <AppText variant="mono" color={palette.paperMuted}>NO EXTERNAL CONNECTION</AppText>
        </View>

        <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!hasCaseInternet ? (
            <EmptyIndex
              icon="file-tray-outline"
              message="The active case contains no archived network nodes. Canonical clues never fall back to the public internet."
              title="NO CASE ARCHIVE"
            />
          ) : !investigationStarted ? (
            <EmptyIndex
              icon="lock-closed-outline"
              message="Review the brief and begin the investigation to authorize this local archive."
              title="ARCHIVE SEALED"
            />
          ) : results.length === 0 ? (
            <EmptyIndex
              icon={mode === 'bookmarks' ? 'bookmark-outline' : mode === 'history' ? 'time-outline' : 'search-outline'}
              message={query ? 'No authored case pages contain that term.' : `No ${mode} entries are stored for this case.`}
              title={query ? 'NO LOCAL MATCH' : 'NOTHING RECORDED'}
            />
          ) : (
            results.map((result, index) => {
              const key = createFictionalPageKey(
                result.location.siteId,
                result.location.pageId,
              );
              const visited = playerState.fictionalInternet.visitedPageKeys.includes(key);
              const bookmarked = playerState.fictionalInternet.bookmarkedPageKeys.includes(key);
              return (
                <IndexResultRow
                  bookmarked={bookmarked}
                  hapticsEnabled={hapticsEnabled}
                  index={index}
                  key={`${key}-${index}`}
                  onPress={() => openResult(result)}
                  result={result}
                  visited={visited}
                />
              );
            })
          )}
          <View style={styles.bottomNote}>
            <Ionicons color={palette.paperMuted} name="cloud-offline-outline" size={15} />
            <AppText variant="mono" color={palette.paperMuted} style={styles.bottomNoteCopy}>
              CASE NET renders signed local records from the case file. It cannot browse, request, or resolve public websites.
            </AppText>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function ModeButton({
  active,
  hapticsEnabled,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  hapticsEnabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TactilePressable
      accessibilityLabel={`Show ${label.toLowerCase()}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Ionicons color={active ? palette.brass : palette.paperMuted} name={icon} size={17} />
      <AppText variant="label" color={active ? palette.paper : palette.paperMuted}>{label}</AppText>
    </TactilePressable>
  );
}

function IndexResultRow({
  bookmarked,
  hapticsEnabled,
  index,
  onPress,
  result,
  visited,
}: {
  bookmarked: boolean;
  hapticsEnabled: boolean;
  index: number;
  onPress: () => void;
  result: IndexResult;
  visited: boolean;
}) {
  const { identity } = result.site;
  const radius = identity.shape === 'square' ? 0 : identity.shape === 'soft' ? 10 : 24;
  return (
    <TactilePressable
      accessibilityHint={visited ? 'Already captured during this investigation' : undefined}
      accessibilityLabel={`Open ${result.title} on ${identity.fictionalHost}`}
      accessibilityRole="link"
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      style={styles.resultRow}
    >
      <View style={[styles.siteMark, { backgroundColor: identity.colors.surface, borderColor: identity.colors.accent, borderRadius: radius }]}>
        <AppText variant="label" color={identity.colors.accent}>{identity.shortName.slice(0, 3)}</AppText>
      </View>
      <View style={styles.resultCopy}>
        <View style={styles.resultDomainRow}>
          <AppText variant="mono" color={palette.brass} numberOfLines={1} style={styles.resultDomain}>
            {identity.fictionalHost}
          </AppText>
          {bookmarked ? <Ionicons color={palette.brass} name="bookmark" size={13} /> : null}
        </View>
        <AppText variant="title" color={palette.paper} numberOfLines={2}>{result.title}</AppText>
        <AppText variant="bodySmall" color={palette.paperMuted} numberOfLines={2}>{result.excerpt}</AppText>
        <View style={styles.resultStatusRow}>
          <AppText variant="mono" color={palette.paperMuted}>NODE {String(index + 1).padStart(2, '0')}</AppText>
          <AppText variant="mono" color={visited ? palette.moss : palette.paperMuted}>{visited ? 'VISITED' : 'UNOPENED'}</AppText>
        </View>
      </View>
      <Ionicons color={palette.paper} name="arrow-forward" size={20} />
    </TactilePressable>
  );
}

function EmptyIndex({
  icon,
  message,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  title: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons color={palette.brass} name={icon} size={34} />
      <AppText variant="title" color={palette.paper}>{title}</AppText>
      <AppText variant="bodySmall" color={palette.paperMuted} style={styles.emptyCopy}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 3 },
  statusPip: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.brass },
  archiveSeal: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderLeftWidth: 1, borderLeftColor: palette.line, paddingLeft: spacing.md },
  searchField: { minHeight: 54, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.line, backgroundColor: palette.charcoal },
  input: { flex: 1, paddingHorizontal: spacing.sm, color: palette.paper, fontSize: 13, fontFamily: 'System', letterSpacing: 0.6 },
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modeBar: { height: 50, marginHorizontal: spacing.lg, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.line },
  modeButton: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeButtonActive: { borderBottomColor: palette.brass },
  resultMeta: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  results: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  resultRow: { minHeight: 136, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: palette.line, paddingVertical: spacing.md },
  siteMark: { width: 52, height: 52, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1, gap: 4 },
  resultDomainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resultDomain: { flexShrink: 1 },
  resultStatusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line, borderBottomWidth: 1, borderBottomColor: palette.line },
  emptyCopy: { maxWidth: 300, textAlign: 'center' },
  bottomNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: palette.line },
  bottomNoteCopy: { flex: 1 },
});
