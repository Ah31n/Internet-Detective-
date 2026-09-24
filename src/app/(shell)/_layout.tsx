import { Stack } from 'expo-router';

import { palette } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';

export default function ShellLayout() {
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.ink },
        animation: reduceMotion ? 'none' : 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  );
}
