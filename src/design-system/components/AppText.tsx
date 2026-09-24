import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import {
  FIXED_SURFACE_FONT_SCALE,
  MAX_FONT_SCALE,
  resolveTextColor,
  useHighContrast,
  useTextScale,
} from '../theme/accessibility';
import { palette, typography } from '../theme/tokens';

type TextVariant = 'display' | 'title' | 'body' | 'bodySmall' | 'label' | 'mono';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  /**
   * Opts a string out of text scaling. Reserved for text printed *onto* a
   * fixed-size object — the faces of the cards on the evidence board — where
   * growing the type would overflow the card rather than help anyone. Those
   * same words are fully scalable in evidence inspection, one tap away.
   */
  fixedScale?: boolean;
}

/**
 * The single text primitive.
 *
 * Every string in the game goes through here, which is what makes text scale
 * and contrast a setting rather than a rewrite:
 *
 * - the in-game text scale multiplies the variant's size and line height
 * - OS Dynamic Type still applies on top, clamped per variant so a heading
 *   cannot grow until it breaks its own screen
 * - authored colours are mapped to their most legible sibling, and promoted
 *   again when the player turns high contrast on
 */
export function AppText({
  children,
  variant = 'body',
  color = palette.white,
  fixedScale = false,
  style,
  ...props
}: PropsWithChildren<AppTextProps>) {
  const textScale = useTextScale();
  const scale = fixedScale ? 1 : textScale;
  const highContrast = useHighContrast();
  const variantStyle = styles[variant];
  const scaled =
    scale === 1
      ? null
      : {
          fontSize: Math.round((variantStyle.fontSize ?? 16) * scale),
          lineHeight: Math.round((variantStyle.lineHeight ?? 22) * scale),
        };

  return (
    <Text
      maxFontSizeMultiplier={
        fixedScale ? FIXED_SURFACE_FONT_SCALE : MAX_FONT_SCALE[variant]
      }
      style={[
        styles.base,
        variantStyle,
        scaled,
        { color: resolveTextColor(color, highContrast) },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.family.sans,
  },
  display: {
    fontFamily: typography.family.serif,
    fontSize: typography.size.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: typography.family.serif,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  bodySmall: {
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  label: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  mono: {
    fontFamily: typography.family.mono,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    letterSpacing: 0.6,
  },
});
