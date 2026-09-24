import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';

interface ShellHeaderProps {
  eyebrow: string;
  title?: string;
  backHref?: Href;
  showSettings?: boolean;
}

export function ShellHeader({
  eyebrow,
  title,
  backHref = '/investigation-home',
  showSettings = true,
}: ShellHeaderProps) {
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );

  return (
    <View style={styles.header}>
      <TactilePressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hapticsEnabled={hapticsEnabled}
        hitSlop={10}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace(backHref);
        }}
        style={styles.iconButton}
      >
        <Ionicons color={palette.paper} name="chevron-back" size={24} />
      </TactilePressable>

      <View accessibilityRole="header" style={styles.copy}>
        <AppText variant="label" color={palette.brass} numberOfLines={1}>
          {eyebrow}
        </AppText>
        {title ? (
          <AppText variant="bodySmall" color={palette.paperMuted} numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
      </View>

      {showSettings ? (
        <TactilePressable
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          hitSlop={10}
          onPress={() => router.push('/settings')}
          style={styles.iconButton}
        >
          <Ionicons color={palette.paper} name="settings-outline" size={22} />
        </TactilePressable>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  iconButton: {
    width: 48,
    minHeight: 52,
    paddingVertical: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: 1,
  },
});
