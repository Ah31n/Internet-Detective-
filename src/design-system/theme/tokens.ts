import { Platform } from 'react-native';

import { palette, typeRamp } from './palette';

export { palette, spacing, radius, touch, typeRamp } from './palette';

export const typography = {
  family: {
    sans: Platform.select({ ios: 'System', android: 'sans-serif' }),
    serif: Platform.select({ ios: 'New York', android: 'serif' }),
    mono: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  size: typeRamp.size,
  lineHeight: typeRamp.lineHeight,
} as const;

export const motion = {
  quick: 140,
  standard: 240,
  deliberate: 420,
  spring: {
    damping: 18,
    stiffness: 210,
    mass: 0.75,
  },
  /** Fast, low-travel response for press states. */
  press: {
    damping: 26,
    stiffness: 430,
    mass: 0.6,
  },
  /** Picking an object up off the surface. */
  lift: {
    damping: 15,
    stiffness: 280,
    mass: 0.8,
  },
  /** Paper settling back onto cork, with a little overshoot. */
  settle: {
    damping: 12,
    stiffness: 165,
    mass: 0.95,
  },
  /** Sheet tracking and snapping. */
  sheet: {
    damping: 24,
    stiffness: 300,
    mass: 0.7,
  },
  /** Flick velocity (points/second) that counts as an intentional throw. */
  flickVelocity: 780,
} as const;

export const shadows = {
  lifted: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;
