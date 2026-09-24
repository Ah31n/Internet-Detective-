import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';

import { palette } from '../theme/tokens';

interface ScreenProps extends ViewProps {
  safeArea?: boolean;
  edges?: readonly Edge[];
}

export function Screen({
  children,
  safeArea = true,
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  ...props
}: PropsWithChildren<ScreenProps>) {
  const content = (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );

  if (!safeArea) return content;

  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    flex: 1,
    backgroundColor: palette.ink,
  },
});
