/**
 * CONTRAST MATHS
 *
 * WCAG 2.1 relative luminance and contrast ratio, kept pure so the palette can
 * be held to a measurable standard by the test suite instead of by eye.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = channel(parseInt(clean.slice(0, 2), 16));
  const g = channel(parseInt(clean.slice(2, 4), 16));
  const b = channel(parseInt(clean.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;

export function meetsAA(ratio: number, large = false): boolean {
  return ratio >= (large ? AA_LARGE_TEXT : AA_TEXT);
}
