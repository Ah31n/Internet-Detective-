import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';

export function MissingMediaSurface({
  assetId,
  kind,
}: {
  assetId: string;
  kind: 'image' | 'video';
}) {
  return (
    <View style={styles.surface}>
      <View style={styles.scanline} />
      <Ionicons
        color={palette.brass}
        name={kind === 'image' ? 'image-outline' : 'videocam-outline'}
        size={38}
      />
      <AppText variant="label" color={palette.brass} style={styles.title}>
        MEDIA NOT INSTALLED
      </AppText>
      <AppText variant="mono" color={palette.paperMuted}>
        ASSET / {assetId}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.black,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  scanline: {
    position: 'absolute',
    top: '46%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.moss,
    opacity: 0.35,
  },
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
