import { palette } from './palette';

/**
 * ACCESSIBLE COLOUR AND TYPE RULES
 *
 * Pure, device-free, and therefore testable: the mapping from an authored
 * colour to the colour a player actually reads, plus the ceilings that keep
 * scaled type inside the layout it was designed for.
 */

/**
 * Per-variant ceilings on the combined OS + in-game scale. Body copy can grow
 * a long way; a 38pt serif display can not, or it starts pushing controls off
 * the screen. These are the values the layout was tested against.
 */
export const MAX_FONT_SCALE = {
  display: 1.4,
  title: 1.5,
  body: 1.9,
  bodySmall: 1.9,
  label: 1.7,
  mono: 1.7,
} as const;

/**
 * Text printed onto a fixed-size object (an evidence card on the wall) still
 * honours Dynamic Type a little, but cannot grow past the card it is on.
 */
export const FIXED_SURFACE_FONT_SCALE = 1.15;

/**
 * Colours that are legible but quiet by default, and unmistakable in high
 * contrast. Anything not listed here is already well clear of WCAG AA and is
 * returned untouched.
 */
const LEGIBLE_TEXT: Record<string, string> = {
  // Surface colours are never used for text: they are swapped for the
  // matching text variant so small metadata still passes AA.
  [palette.rust]: palette.rustText,
  [palette.moss]: palette.mossText,
  [palette.line]: palette.paperMuted,
};

const HIGH_CONTRAST_TEXT: Record<string, string> = {
  [palette.paperMuted]: palette.paper,
  [palette.rust]: '#E8A48E',
  [palette.rustText]: '#E8A48E',
  [palette.rustInk]: '#551D12',
  [palette.moss]: '#A8C094',
  [palette.mossText]: '#A8C094',
  [palette.mossInk]: '#1F2C18',
  [palette.brass]: '#E9C377',
  [palette.line]: palette.paper,
  [palette.inkSoft]: palette.ink,
};

/** Maps an authored text colour to the most legible colour for this player. */
export function resolveTextColor(color: string, highContrast: boolean): string {
  if (highContrast) {
    return HIGH_CONTRAST_TEXT[color] ?? LEGIBLE_TEXT[color] ?? color;
  }
  return LEGIBLE_TEXT[color] ?? color;
}

/** Scales a type-ramp size, rounded to whole points to keep metrics crisp. */
export function scaleType(size: number, scale: number): number {
  return Math.round(size * scale);
}
