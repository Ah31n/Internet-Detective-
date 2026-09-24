import { useAppStore, TEXT_SCALE_MULTIPLIER } from '@/state/app.store';

import { resolveTextColor } from './accessibilityColors';

/**
 * THE ACCESSIBILITY LAYER
 *
 * Three levers, all of which leave the game's visual identity intact:
 *
 * - **Text scale** multiplies the type ramp on top of the operating system's
 *   own Dynamic Type setting, and is clamped per variant so a display heading
 *   cannot grow until it breaks the layout it sits in.
 * - **High contrast** promotes every muted, tinted, or decorative text colour
 *   to its most legible sibling. Hues are preserved; only luminance moves.
 * - **Reduced motion** is honoured by the motion system and by the board,
 *   where cards stop rotating entirely.
 *
 * Colour is never the whole message: contradictions always pair colour with an
 * icon and the word itself.
 */

export {
  FIXED_SURFACE_FONT_SCALE,
  MAX_FONT_SCALE,
  resolveTextColor,
  scaleType,
} from './accessibilityColors';

export function useTextScale(): number {
  const textScale = useAppStore((state) => state.settings.textScale);
  return TEXT_SCALE_MULTIPLIER[textScale];
}

export function useHighContrast(): boolean {
  return useAppStore((state) => state.settings.highContrast);
}

/** Maps an icon's colour the same way its neighbouring label is mapped. */
export function useAccessibleColor(color: string): string {
  return resolveTextColor(color, useHighContrast());
}
