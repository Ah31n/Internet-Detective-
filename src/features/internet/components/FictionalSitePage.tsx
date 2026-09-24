import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  FictionalPageBlock,
  FictionalPageDefinition,
  FictionalPageLink,
  FictionalSiteDefinition,
} from '@/case-engine';
import { resolveFictionalInternetImage } from '@/case-content/internetMediaRegistry';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { spacing, typography } from '@/design-system/theme/tokens';

interface FictionalSitePageProps {
  site: FictionalSiteDefinition;
  page: FictionalPageDefinition;
  hapticsEnabled: boolean;
  onOpenLink: (link: FictionalPageLink) => void;
}

export function FictionalSitePage({
  site,
  page,
  hapticsEnabled,
  onOpenLink,
}: FictionalSitePageProps) {
  const insets = useSafeAreaInsets();
  const identity = site.identity;
  const radius = identity.shape === 'square' ? 0 : identity.shape === 'soft' ? 12 : 999;
  const titleFamily =
    identity.typography === 'editorial' || identity.typography === 'tabloid'
      ? typography.family.serif
      : identity.typography === 'technical'
        ? typography.family.mono
        : typography.family.sans;

  return (
    <View style={[styles.root, { backgroundColor: identity.colors.background }]}>
      <SiteMasthead site={site} titleFamily={titleFamily} radius={radius} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.pageIntro,
            identity.layout === 'newsroom' && styles.newsroomIntro,
            identity.layout === 'community' && { backgroundColor: identity.colors.surface },
            identity.layout === 'broadcast' && { borderLeftColor: identity.colors.accent },
          ]}
        >
          {page.publishedAtLabel ? (
            <AppText variant="mono" color={identity.colors.muted}>
              {page.publishedAtLabel}
            </AppText>
          ) : null}
          <AppText
            variant="display"
            color={identity.colors.text}
            style={[styles.pageTitle, { fontFamily: titleFamily }]}
          >
            {page.title}
          </AppText>
          <AppText variant="body" color={identity.colors.muted}>
            {page.description}
          </AppText>
        </View>

        <View style={styles.blocks}>
          {page.blocks.map((block) => (
            <SiteBlock
              key={block.id}
              block={block}
              identity={identity}
              radius={radius}
              titleFamily={titleFamily}
            />
          ))}
        </View>

        {page.links.length > 0 ? (
          <View style={[styles.links, { borderTopColor: identity.colors.accent }]}>
            <AppText variant="label" color={identity.colors.muted}>
              LOCAL LINKS
            </AppText>
            {page.links.map((link) => (
              <TactilePressable
                key={link.id}
                accessibilityLabel={`Open ${link.label}`}
                accessibilityRole="link"
                hapticsEnabled={hapticsEnabled}
                onPress={() => onOpenLink(link)}
                style={[
                  styles.link,
                  {
                    borderColor: identity.colors.accent,
                    backgroundColor:
                      link.treatment === 'primary'
                        ? identity.colors.accent
                        : identity.colors.surface,
                    borderRadius: radius,
                  },
                ]}
              >
                <AppText
                  variant="bodySmall"
                  color={
                    link.treatment === 'primary'
                      ? identity.colors.background
                      : identity.colors.text
                  }
                  style={styles.linkCopy}
                >
                  {link.label}
                </AppText>
                <Ionicons
                  color={
                    link.treatment === 'primary'
                      ? identity.colors.background
                      : identity.colors.accent
                  }
                  name="arrow-forward"
                  size={18}
                />
              </TactilePressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.siteFooter, { borderTopColor: identity.colors.muted }]}>
          <AppText variant="mono" color={identity.colors.muted}>
            LOCAL CASE COPY · {identity.fictionalHost}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function SiteMasthead({
  site,
  titleFamily,
  radius,
}: {
  site: FictionalSiteDefinition;
  titleFamily: string | undefined;
  radius: number;
}) {
  const { identity } = site;

  if (identity.layout === 'newsroom') {
    return (
      <View style={[styles.masthead, styles.newsroomMasthead, { borderColor: identity.colors.text }]}>
        <AppText variant="display" color={identity.colors.text} style={{ fontFamily: titleFamily }}>
          {identity.logoText}
        </AppText>
        <View style={[styles.mastheadRule, { backgroundColor: identity.colors.accent }]} />
        <AppText variant="mono" color={identity.colors.muted}>
          {identity.tagline.toUpperCase()}
        </AppText>
      </View>
    );
  }

  if (identity.layout === 'community') {
    return (
      <View style={[styles.masthead, styles.communityMasthead, { backgroundColor: identity.colors.surface }]}>
        <View style={[styles.communityLogo, { backgroundColor: identity.colors.accent, borderRadius: radius }]}>
          <AppText variant="label" color={identity.colors.background}>
            {identity.shortName}
          </AppText>
        </View>
        <View style={styles.mastheadCopy}>
          <AppText variant="title" color={identity.colors.text} style={{ fontFamily: titleFamily }}>
            {identity.logoText}
          </AppText>
          <AppText variant="mono" color={identity.colors.muted}>
            {identity.tagline}
          </AppText>
        </View>
        <View style={[styles.onlinePip, { backgroundColor: identity.colors.accent }]} />
      </View>
    );
  }

  if (identity.layout === 'market') {
    return (
      <View style={[styles.masthead, styles.marketMasthead, { backgroundColor: identity.colors.accent }]}>
        <AppText variant="display" color={identity.colors.background} style={{ fontFamily: titleFamily }}>
          {identity.logoText}
        </AppText>
        <AppText variant="label" color={identity.colors.background}>
          {identity.tagline}
        </AppText>
      </View>
    );
  }

  if (identity.layout === 'institutional') {
    return (
      <View style={[styles.masthead, styles.institutionalMasthead, { backgroundColor: identity.colors.surface }]}>
        <View style={[styles.crest, { borderColor: identity.colors.accent }]}>
          <AppText variant="label" color={identity.colors.accent}>{identity.shortName}</AppText>
        </View>
        <View style={styles.mastheadCopy}>
          <AppText variant="title" color={identity.colors.text} style={{ fontFamily: titleFamily }}>
            {identity.logoText}
          </AppText>
          <AppText variant="mono" color={identity.colors.muted}>{identity.tagline}</AppText>
        </View>
      </View>
    );
  }

  if (identity.layout === 'personal') {
    return (
      <View style={[styles.masthead, styles.personalMasthead]}>
        <AppText variant="display" color={identity.colors.accent} style={{ fontFamily: titleFamily, fontStyle: 'italic' }}>
          {identity.logoText}
        </AppText>
        <AppText variant="bodySmall" color={identity.colors.muted}>{identity.tagline}</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.masthead, styles.broadcastMasthead, { backgroundColor: identity.colors.surface, borderBottomColor: identity.colors.accent }]}>
      <View style={[styles.liveBadge, { backgroundColor: identity.colors.accent }]}>
        <AppText variant="label" color={identity.colors.background}>LOCAL</AppText>
      </View>
      <AppText variant="display" color={identity.colors.text} style={{ fontFamily: titleFamily }}>
        {identity.logoText}
      </AppText>
      <AppText variant="mono" color={identity.colors.muted}>{identity.tagline}</AppText>
    </View>
  );
}

function SiteBlock({
  block,
  identity,
  radius,
  titleFamily,
}: {
  block: FictionalPageBlock;
  identity: FictionalSiteDefinition['identity'];
  radius: number;
  titleFamily: string | undefined;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <AppText
          variant={block.level === 1 ? 'display' : 'title'}
          color={identity.colors.text}
          style={[styles.blockHeading, { fontFamily: titleFamily }]}
        >
          {block.text}
        </AppText>
      );
    case 'paragraph':
      return <AppText variant="body" color={identity.colors.text}>{block.text}</AppText>;
    case 'quote':
      return (
        <View style={[styles.quote, { borderLeftColor: identity.colors.accent }]}>
          <AppText variant="title" color={identity.colors.text} style={{ fontFamily: titleFamily }}>
            “{block.text}”
          </AppText>
          {block.attribution ? (
            <AppText variant="mono" color={identity.colors.muted}>— {block.attribution}</AppText>
          ) : null}
        </View>
      );
    case 'notice':
      return (
        <View
          style={[
            styles.notice,
            {
              borderRadius: radius,
              borderColor:
                block.tone === 'urgent'
                  ? identity.colors.accentSecondary
                  : identity.colors.accent,
              backgroundColor: identity.colors.surface,
            },
          ]}
        >
          <AppText variant="label" color={identity.colors.accent}>{block.label}</AppText>
          <AppText variant="bodySmall" color={identity.colors.text}>{block.text}</AppText>
        </View>
      );
    case 'image': {
      const source = resolveFictionalInternetImage(block.image.assetId);
      return (
        <View>
          <View style={[styles.siteImage, { aspectRatio: block.image.aspectRatio, borderRadius: radius, backgroundColor: identity.colors.surface }]}>
            {source ? (
              <Image
                accessibilityLabel={block.image.altText}
                contentFit="cover"
                source={source}
                style={styles.fill}
              />
            ) : (
              <View style={styles.localAssetMissing}>
                <Ionicons color={identity.colors.accent} name="image-outline" size={32} />
                <AppText variant="mono" color={identity.colors.muted}>LOCAL ASSET / {block.image.assetId}</AppText>
              </View>
            )}
          </View>
          {block.caption ? (
            <AppText variant="mono" color={identity.colors.muted} style={styles.caption}>{block.caption}</AppText>
          ) : null}
        </View>
      );
    }
    case 'metric':
      return (
        <View style={[styles.metric, { backgroundColor: identity.colors.surface, borderRadius: radius }]}>
          <AppText variant="mono" color={identity.colors.muted}>{block.label}</AppText>
          <AppText variant="display" color={identity.colors.accent} style={{ fontFamily: titleFamily }}>{block.value}</AppText>
          {block.detail ? <AppText variant="bodySmall" color={identity.colors.text}>{block.detail}</AppText> : null}
        </View>
      );
    case 'list':
      return (
        <View style={[styles.list, { borderTopColor: identity.colors.muted }]}>
          {block.items.map((item, index) => (
            <View key={`${block.id}-${index}`} style={[styles.listRow, { borderBottomColor: identity.colors.muted }]}>
              <AppText variant="mono" color={identity.colors.accent} style={styles.listIndex}>
                {block.ordered ? String(index + 1).padStart(2, '0') : '◆'}
              </AppText>
              <AppText variant="body" color={identity.colors.text} style={styles.listCopy}>{item}</AppText>
            </View>
          ))}
        </View>
      );
    case 'post':
      return (
        <View style={[styles.post, { backgroundColor: identity.colors.surface, borderRadius: radius }]}>
          <View style={styles.postHeader}>
            <View style={[styles.postAvatar, { backgroundColor: identity.colors.accent, borderRadius: identity.shape === 'square' ? 2 : 18 }]}>
              <AppText variant="label" color={identity.colors.background}>{block.author.slice(0, 2).toUpperCase()}</AppText>
            </View>
            <View style={styles.postIdentity}>
              <AppText variant="bodySmall" color={identity.colors.text}>{block.author}</AppText>
              <AppText variant="mono" color={identity.colors.muted}>{block.handle ?? block.timestampLabel}</AppText>
            </View>
            <AppText variant="mono" color={identity.colors.muted}>{block.timestampLabel}</AppText>
          </View>
          <AppText variant="body" color={identity.colors.text}>{block.body}</AppText>
          {block.reactionLabel ? <AppText variant="mono" color={identity.colors.accent}>{block.reactionLabel}</AppText> : null}
        </View>
      );
    case 'profile': {
      const source = block.image
        ? resolveFictionalInternetImage(block.image.assetId)
        : null;
      return (
        <View style={[styles.profile, { backgroundColor: identity.colors.surface, borderRadius: radius }]}>
          <View style={[styles.profileImage, { borderRadius: identity.shape === 'square' ? 0 : 42, backgroundColor: identity.colors.background }]}>
            {source && block.image ? (
              <Image accessibilityLabel={block.image.altText} contentFit="cover" source={source} style={styles.fill} />
            ) : (
              <AppText variant="display" color={identity.colors.accent}>{block.name.slice(0, 1)}</AppText>
            )}
          </View>
          <View style={styles.profileCopy}>
            <AppText variant="title" color={identity.colors.text} style={{ fontFamily: titleFamily }}>{block.name}</AppText>
            {block.role ? <AppText variant="mono" color={identity.colors.accent}>{block.role}</AppText> : null}
            <AppText variant="bodySmall" color={identity.colors.muted}>{block.bio}</AppText>
          </View>
          {block.facts?.map((fact) => (
            <View key={fact.label} style={[styles.factRow, { borderTopColor: identity.colors.muted }]}>
              <AppText variant="mono" color={identity.colors.muted}>{fact.label}</AppText>
              <AppText variant="bodySmall" color={identity.colors.text}>{fact.value}</AppText>
            </View>
          ))}
        </View>
      );
    }
    case 'product': {
      const source = block.image
        ? resolveFictionalInternetImage(block.image.assetId)
        : null;
      return (
        <View style={[styles.product, { backgroundColor: identity.colors.surface, borderRadius: radius }]}>
          {block.image ? (
            <View style={[styles.productImage, { backgroundColor: identity.colors.background }]}>
              {source ? (
                <Image accessibilityLabel={block.image.altText} contentFit="cover" source={source} style={styles.fill} />
              ) : (
                <Ionicons color={identity.colors.accent} name="cube-outline" size={34} />
              )}
            </View>
          ) : null}
          <View style={styles.productCopy}>
            <AppText variant="title" color={identity.colors.text} style={{ fontFamily: titleFamily }}>{block.name}</AppText>
            <AppText variant="label" color={identity.colors.accent}>{block.priceLabel}</AppText>
            <AppText variant="bodySmall" color={identity.colors.muted}>{block.description}</AppText>
            {block.statusLabel ? <AppText variant="mono" color={identity.colors.accentSecondary}>{block.statusLabel}</AppText> : null}
          </View>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  masthead: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  newsroomMasthead: { alignItems: 'center', borderBottomWidth: 3, borderTopWidth: 1 },
  mastheadRule: { width: '100%', height: 1, marginVertical: spacing.xs },
  communityMasthead: { flexDirection: 'row', alignItems: 'center' },
  communityLogo: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  mastheadCopy: { flex: 1, marginLeft: spacing.sm },
  onlinePip: { width: 9, height: 9, borderRadius: 5 },
  marketMasthead: { minHeight: 92, justifyContent: 'center' },
  institutionalMasthead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  crest: { width: 52, height: 52, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  personalMasthead: { paddingVertical: spacing.xl },
  broadcastMasthead: { borderBottomWidth: 4 },
  liveBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.xs, paddingVertical: 3, marginBottom: spacing.xs },
  pageIntro: { padding: spacing.lg },
  newsroomIntro: { alignItems: 'center' },
  pageTitle: { marginVertical: spacing.sm },
  blocks: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  blockHeading: { marginTop: spacing.md },
  quote: { borderLeftWidth: 4, paddingLeft: spacing.md, gap: spacing.sm },
  notice: { borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  siteImage: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  localAssetMissing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  caption: { marginTop: spacing.xs },
  metric: { padding: spacing.lg },
  list: { borderTopWidth: 1 },
  listRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  listIndex: { width: 34 },
  listCopy: { flex: 1 },
  post: { padding: spacing.md, gap: spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postAvatar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  postIdentity: { flex: 1, marginLeft: spacing.sm },
  profile: { padding: spacing.lg },
  profileImage: { width: 84, height: 84, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  profileCopy: { gap: spacing.xs, marginTop: spacing.md },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  product: { overflow: 'hidden' },
  productImage: { height: 180, alignItems: 'center', justifyContent: 'center' },
  productCopy: { padding: spacing.md, gap: spacing.xs },
  links: { margin: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 2, gap: spacing.sm },
  link: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderWidth: 1 },
  linkCopy: { flex: 1 },
  siteFooter: { margin: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl, borderTopWidth: StyleSheet.hairlineWidth },
});
