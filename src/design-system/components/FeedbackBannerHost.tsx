import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedbackSignals } from '@/core/feedback/feedbackSignals';
import type { FeedbackKind } from '@/core/feedback/transitionFeedback';
import { useAppStore } from '@/state/app.store';

import { useAccessibleColor } from '../theme/accessibility';
import { palette, radius, spacing } from '../theme/tokens';
import { AppText } from './AppText';
import { TactilePressable } from './TactilePressable';

const VISIBLE_MS = 2400;

const ACCENT: Record<FeedbackKind, string> = {
  discovery: palette.brass,
  placement: palette.brass,
  connection: palette.brass,
  contradiction: palette.rust,
  deduction: palette.moss,
  timeline: palette.moss,
  message: palette.paperMuted,
  hint: palette.paperMuted,
  completion: palette.brass,
};

const GLYPH: Record<FeedbackKind, React.ComponentProps<typeof Ionicons>['name']> = {
  discovery: 'file-tray-full-outline',
  placement: 'move-outline',
  connection: 'git-commit-outline',
  contradiction: 'flash-outline',
  deduction: 'checkmark-done-outline',
  timeline: 'time-outline',
  message: 'chatbubble-ellipses-outline',
  hint: 'bulb-outline',
  completion: 'ribbon-outline',
};

/**
 * One thin strip, under the status bar and clear of the Dynamic Island,
 * that acknowledges a meaningful event and then gets out of the way.
 * It never blocks touches and never animates continuously.
 */
export function FeedbackBannerHost() {
  const insets = useSafeAreaInsets();
  const banner = useFeedbackSignals((state) => state.banner);
  const dismiss = useFeedbackSignals((state) => state.dismiss);
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);

  useEffect(() => {
    if (!banner) return;
    // Spoken once, politely, so a screen-reader player hears the event
    // without losing the place their focus was already in.
    AccessibilityInfo.announceForAccessibility(
      banner.detail ? `${banner.title}. ${banner.detail}` : banner.title,
    );
    const timer = setTimeout(() => dismiss(banner.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [banner, dismiss]);

  const accent = useAccessibleColor(banner ? ACCENT[banner.kind] : palette.brass);

  if (!banner) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.xs }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        entering={reduceMotion ? undefined : FadeInUp.duration(180)}
        exiting={reduceMotion ? undefined : FadeOutUp.duration(160)}
        key={banner.id}
        pointerEvents="box-none"
      >
        <TactilePressable
          accessibilityLabel={`${banner.title}. Tap to dismiss.`}
          accessibilityRole="alert"
          feedback="none"
          onPress={() => dismiss(banner.id)}
          pressedScale={0.99}
          style={[styles.banner, { borderLeftColor: accent }]}
        >
          <Ionicons color={accent} name={GLYPH[banner.kind]} size={19} />
          <View style={styles.copy}>
            <AppText variant="mono" color={accent} numberOfLines={2}>
              {banner.title}
            </AppText>
            {banner.detail ? (
              <AppText variant="bodySmall" color={palette.paper} numberOfLines={3}>
                {banner.detail}
              </AppText>
            ) : null}
          </View>
        </TactilePressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    right: spacing.sm,
    left: spacing.sm,
    zIndex: 60,
  },
  banner: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(25,29,23,0.97)',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
});
