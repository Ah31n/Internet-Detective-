import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { DocumentEvidenceDefinition } from '@/case-engine';
import { useCueOnMount } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, radius, spacing, touch } from '@/design-system/theme/tokens';

import { DocumentUnfold } from '../components/EvidenceReveal';
import { EvidenceTextBlocks } from './EvidenceTextBlocks';

export function DocumentEvidenceViewer({
  evidence,
  hapticsEnabled = true,
}: {
  evidence: DocumentEvidenceDefinition;
  hapticsEnabled?: boolean;
}) {
  useCueOnMount('ui-paper');
  const { width } = useWindowDimensions();
  const pageWidth = Math.max(280, width - spacing.lg * 2);
  const stride = pageWidth + spacing.md;
  const pager = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / stride);
    setPageIndex(Math.max(0, Math.min(evidence.pages.length - 1, next)));
  };

  const goToPage = (index: number) => {
    setPageIndex(index);
    pager.current?.scrollTo({ x: index * stride, animated: true });
  };

  return (
    <View style={styles.root}>
      <View style={styles.documentMeta}>
        <View style={styles.metaCopy}>
          <AppText variant="label" color={palette.brass} numberOfLines={1}>
            {evidence.documentType}
          </AppText>
          <AppText variant="mono" color={palette.paperMuted} numberOfLines={1}>
            AUTHOR / {evidence.author}
          </AppText>
        </View>
        <AppText variant="mono" color={palette.paperMuted}>
          SHEET {pageIndex + 1}/{evidence.pages.length}
        </AppText>
      </View>

      <ScrollView
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={onMomentumEnd}
        ref={pager}
        showsHorizontalScrollIndicator={false}
        snapToInterval={stride}
        contentContainerStyle={styles.pages}
      >
        {evidence.pages.map((page, index) => (
          <DocumentUnfold
            index={index}
            key={page.id}
            style={[styles.page, { width: pageWidth }]}
          >
            {/* Long sheets read vertically inside the page they belong to. */}
            <ScrollView
              contentContainerStyle={styles.pageContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="mono" color={palette.rustInk}>
                {page.label}
              </AppText>
              <View style={styles.rule} />
              <EvidenceTextBlocks blocks={page.blocks} />
              <AppText
                variant="mono"
                color={palette.paperMuted}
                style={styles.pageId}
              >
                DOC / {page.id}
              </AppText>
            </ScrollView>
          </DocumentUnfold>
        ))}
      </ScrollView>

      {evidence.pages.length > 1 ? (
        <View style={styles.pager}>
          {evidence.pages.map((page, index) => (
            <TactilePressable
              accessibilityLabel={`Go to ${page.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === pageIndex }}
              hapticsEnabled={hapticsEnabled}
              key={page.id}
              onPress={() => goToPage(index)}
              style={styles.pagerTarget}
            >
              <View
                style={[styles.pagerMark, index === pageIndex && styles.pagerMarkActive]}
              />
            </TactilePressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  documentMeta: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  metaCopy: {
    flex: 1,
  },
  pages: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  page: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: palette.paper,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 7,
  },
  pageContent: {
    minHeight: 520,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  rule: {
    height: 2,
    marginVertical: spacing.lg,
    backgroundColor: palette.rust,
  },
  pageId: {
    marginTop: spacing.lg,
    textAlign: 'right',
  },
  pager: {
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  pagerTarget: {
    width: touch.minTarget,
    height: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerMark: {
    width: 22,
    height: 3,
    backgroundColor: palette.line,
  },
  pagerMarkActive: {
    backgroundColor: palette.brass,
  },
});
