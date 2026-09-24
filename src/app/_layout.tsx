import { ErrorBoundary, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAudioSystem } from '@/core/audio/useGameAudio';
import { useAppBootstrap } from '@/core/bootstrap/useAppBootstrap';
import { FeedbackBannerHost } from '@/design-system/components/FeedbackBannerHost';
import { navigationTheme } from '@/design-system/theme/navigationTheme';
import { palette } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';

export { ErrorBoundary };

export default function RootLayout() {
  const isReady = useAppBootstrap();
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  // Prepares the audio session, follows the player's mix, and drops the whole
  // soundscape whenever the app leaves the foreground.
  useAudioSystem();

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: styles.content,
              animation: reduceMotion ? 'none' : 'slide_from_right',
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(shell)" />
            <Stack.Screen
              name="investigation"
              options={{
                // Continuity with the closing case brief.
                animation: reduceMotion ? 'none' : 'fade',
                animationDuration: 260,
              }}
            />
            <Stack.Screen
              name="board"
              options={{
                presentation: 'fullScreenModal',
                animation: reduceMotion ? 'none' : 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="internet"
              options={{
                presentation: 'fullScreenModal',
                animation: reduceMotion ? 'none' : 'fade',
              }}
            />
            <Stack.Screen
              name="evidence"
              options={{
                presentation: 'fullScreenModal',
                animation: reduceMotion ? 'none' : 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="(modals)"
              options={{
                presentation: 'modal',
                animation: reduceMotion ? 'none' : 'slide_from_bottom',
              }}
            />
          </Stack>
          <FeedbackBannerHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    backgroundColor: palette.ink,
  },
});
