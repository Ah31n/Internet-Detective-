import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { GameButton } from '@/design-system/components/GameButton';
import { Screen } from '@/design-system/components/Screen';
import { spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';

export default function NotFoundRoute() {
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );

  return (
    <Screen style={styles.screen}>
      <AppText variant="label">404 · CORRUPT LINK</AppText>
      <AppText variant="title">This lead goes nowhere.</AppText>
      <GameButton
        hapticsEnabled={hapticsEnabled}
        onPress={() => router.replace('/investigation-home')}
      >
        RETURN TO FIELD DESK
      </GameButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
