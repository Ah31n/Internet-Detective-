import { Stack } from 'expo-router';

import { palette } from '@/design-system/theme/tokens';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.ink },
      }}
    />
  );
}
