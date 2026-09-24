import type { PropsWithChildren } from 'react';
import { StyleSheet, type PressableProps } from 'react-native';

import { palette, radius, spacing } from '../theme/tokens';
import { AppText } from './AppText';
import { TactilePressable } from './TactilePressable';

interface GameButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  tone?: 'brass' | 'outline' | 'quiet';
  hapticsEnabled?: boolean;
}

export function GameButton({
  children,
  tone = 'brass',
  hapticsEnabled = true,
  ...props
}: PropsWithChildren<GameButtonProps>) {
  // A button's own words are its label. Callers may still override it when the
  // visible text is shorter than what a screen reader needs to hear.
  const derivedLabel =
    typeof children === 'string' ? children.toLowerCase() : undefined;

  return (
    <TactilePressable
      accessibilityLabel={derivedLabel}
      accessibilityRole="button"
      hapticsEnabled={hapticsEnabled}
      style={[
        styles.base,
        tone === 'brass' && styles.brass,
        tone === 'outline' && styles.outline,
        tone === 'quiet' && styles.quiet,
      ]}
      {...props}
    >
      <AppText
        variant="label"
        color={tone === 'brass' ? palette.ink : palette.paper}
      >
        {children}
      </AppText>
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brass: {
    backgroundColor: palette.brass,
  },
  outline: {
    borderWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.transparent,
  },
  quiet: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
});
