import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { palette, radius, spacing } from '@/design-system/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyInstrumentProps {
  code: string;
  title: string;
  message: string;
  icon: IconName;
}

export function EmptyInstrument({
  code,
  title,
  message,
  icon,
}: EmptyInstrumentProps) {
  return (
    <View style={styles.surface}>
      <View style={styles.crosshairHorizontal} />
      <View style={styles.crosshairVertical} />
      <View style={styles.target}>
        <Ionicons color={palette.brass} name={icon} size={34} />
      </View>
      <AppText variant="mono" color={palette.rust}>
        {code}
      </AppText>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="bodySmall" color={palette.paperMuted} style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
  },
  crosshairHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '42%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.line,
    opacity: 0.5,
  },
  crosshairVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.line,
    opacity: 0.5,
  },
  target: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.ink,
    marginBottom: spacing.lg,
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  message: {
    maxWidth: 300,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
