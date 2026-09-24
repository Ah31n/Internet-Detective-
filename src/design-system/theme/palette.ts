/**
 * Pure design tokens: colour, rhythm, type metrics, and touch ergonomics.
 *
 * Deliberately free of any React Native import so the accessibility layer and
 * the test suite can reason about contrast and type without a device.
 * `tokens.ts` re-exports everything here and adds the platform font families.
 */

export const palette = {
  ink: '#11140F',
  inkSoft: '#191D17',
  charcoal: '#22271F',
  charcoalRaised: '#2B3128',
  line: '#3C4437',
  paper: '#E8DDBF',
  paperMuted: '#BEB397',
  brass: '#D3A44B',
  brassPressed: '#B88834',
  /**
   * `rust` and `moss` are surface colours: seals, rules, stamps, and fills.
   * At text sizes they fall below WCAG AA on the dark surfaces, so text uses
   * the `*Text` variants on dark and the `*Ink` variants on paper. The hues
   * are unchanged — this is a legibility adjustment, not a re-skin.
   */
  rust: '#A95745',
  rustText: '#D4836B',
  rustInk: '#6E2A1E',
  moss: '#758B61',
  mossText: '#8CA678',
  mossInk: '#2D3D22',
  lineStrong: '#6E7C63',
  white: '#F8F5EC',
  black: '#080A07',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const typeRamp = {
  size: {
    // 12 is the smallest size in the game. Evidence IDs, timestamps, and
    // metadata all live here, so it does not go below the legible floor.
    caption: 12,
    body: 16,
    bodySmall: 14,
    title: 26,
    display: 38,
  },
  lineHeight: {
    caption: 16,
    body: 23,
    bodySmall: 20,
    title: 32,
    display: 43,
  },
} as const;

/**
 * Touch ergonomics. Every interactive control resolves to at least
 * `minTarget` points of tappable area, using hit slop where the painted
 * surface is intentionally smaller than the finger target.
 */
export const touch = {
  minTarget: 44,
  comfortableTarget: 48,
  hitSlop: { top: 8, right: 8, bottom: 8, left: 8 },
  wideHitSlop: { top: 14, right: 14, bottom: 14, left: 14 },
  /** Distance a finger may travel before a press becomes a drag. */
  slopDistance: 8,
  longPressMs: 420,
  doubleTapMs: 260,
} as const;

