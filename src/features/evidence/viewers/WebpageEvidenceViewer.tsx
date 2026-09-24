import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { WebpageEvidenceDefinition } from '@/case-engine';
import { resolveEvidenceImage } from '@/case-content/evidenceMediaRegistry';
import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';

import { PageLoad } from '../components/EvidenceReveal';
import { EvidenceTextBlocks } from './EvidenceTextBlocks';
import { MissingMediaSurface } from './MissingMediaSurface';

export function WebpageEvidenceViewer({
  evidence,
}: {
  evidence: WebpageEvidenceDefinition;
}) {
  const heroSource = evidence.heroImage
    ? resolveEvidenceImage(evidence.heroImage)
    : null;

  return (
    <View style={styles.root}>
      <View style={styles.browserBar}>
        <View style={styles.lockIcon}>
          <Ionicons color={palette.moss} name="lock-closed" size={12} />
        </View>
        <AppText variant="mono" color={palette.paperMuted} numberOfLines={1} style={styles.url}>
          {evidence.displayUrl}
        </AppText>
        <Ionicons color={palette.paperMuted} name="ellipsis-horizontal" size={18} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageLoad index={0} style={styles.captureNotice}>
          <AppText variant="mono" color={palette.rust}>
            OFFLINE CAPTURE · {evidence.capturedAtLabel}
          </AppText>
        </PageLoad>
        <PageLoad index={1} style={styles.articleHeader}>
          <AppText variant="label" color={palette.brass}>
            {evidence.siteName}
          </AppText>
          <AppText variant="display" style={styles.headline}>
            {evidence.headline}
          </AppText>
          {evidence.byline || evidence.publishedAtLabel ? (
            <AppText variant="mono" color={palette.paperMuted}>
              {[evidence.byline, evidence.publishedAtLabel].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
        </PageLoad>
        {evidence.heroImage ? (
          <PageLoad index={2} style={styles.hero}>
            {heroSource ? (
              <Image
                accessibilityLabel={evidence.heroImage.altText}
                contentFit="cover"
                source={heroSource}
                style={styles.heroImage}
              />
            ) : (
              <MissingMediaSurface assetId={evidence.heroImage.assetId} kind="image" />
            )}
          </PageLoad>
        ) : null}
        <PageLoad index={3} style={styles.articleBody}>
          <EvidenceTextBlocks
            blocks={evidence.body}
            ink={palette.paper}
            muted={palette.paperMuted}
          />
        </PageLoad>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#131613',
  },
  browserBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: palette.charcoal,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  lockIcon: {
    marginRight: spacing.xs,
  },
  url: {
    flex: 1,
  },
  captureNotice: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#261A15',
  },
  articleHeader: {
    padding: spacing.lg,
  },
  headline: {
    marginVertical: spacing.sm,
  },
  hero: {
    height: 230,
  },
  heroImage: {
    flex: 1,
  },
  articleBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
