import { describe, expect, it } from 'vitest';

import {
  FIXED_SURFACE_FONT_SCALE,
  MAX_FONT_SCALE,
  resolveTextColor,
} from '../accessibilityColors';
import { AA_LARGE_TEXT, AA_TEXT, contrastRatio, meetsAA } from '../contrast';
import { palette, touch, typeRamp } from '../palette';

/**
 * PHASE 14 — the palette is held to WCAG AA by the test suite rather than by
 * eye. Every colour the game actually prints text in is checked against every
 * surface it can be printed on.
 */

const DARK_SURFACES = [palette.ink, palette.charcoal, palette.charcoalRaised];
const PAPER_SURFACES = [palette.paper, palette.paperMuted];

const DARK_TEXT = [
  palette.paper,
  palette.paperMuted,
  palette.brass,
  palette.rustText,
  palette.mossText,
  palette.white,
];

const PAPER_TEXT = [palette.ink, palette.inkSoft, palette.rustInk];

describe('phase 14 · contrast', () => {
  it('computes known reference ratios', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 5);
  });

  it('passes AA for every text colour on every dark surface', () => {
    for (const text of DARK_TEXT) {
      for (const surface of DARK_SURFACES) {
        const ratio = contrastRatio(text, surface);
        expect(
          meetsAA(ratio),
          `${text} on ${surface} is ${ratio.toFixed(2)}:1`,
        ).toBe(true);
      }
    }
  });

  it('passes AA for every ink colour on every paper surface', () => {
    for (const text of PAPER_TEXT) {
      for (const surface of PAPER_SURFACES) {
        const ratio = contrastRatio(text, surface);
        expect(
          meetsAA(ratio),
          `${text} on ${surface} is ${ratio.toFixed(2)}:1`,
        ).toBe(true);
      }
    }
  });

  it('never lets a surface colour be used as text without correction', () => {
    // `rust` and `moss` are seals and rules; below AA at text sizes.
    expect(meetsAA(contrastRatio(palette.rust, palette.charcoal))).toBe(false);
    expect(meetsAA(contrastRatio(palette.moss, palette.charcoal))).toBe(false);
    // AppText maps them to their legible siblings before they are ever drawn.
    expect(resolveTextColor(palette.rust, false)).toBe(palette.rustText);
    expect(resolveTextColor(palette.moss, false)).toBe(palette.mossText);
    expect(
      meetsAA(contrastRatio(resolveTextColor(palette.rust, false), palette.charcoalRaised)),
    ).toBe(true);
  });

  it('raises contrast further, never lowers it, in high contrast mode', () => {
    for (const text of [palette.paperMuted, palette.rust, palette.moss, palette.brass]) {
      const standard = contrastRatio(resolveTextColor(text, false), palette.charcoal);
      const raised = contrastRatio(resolveTextColor(text, true), palette.charcoal);
      expect(raised).toBeGreaterThan(standard);
    }
  });

  it('keeps high-contrast ink darker than standard ink on paper', () => {
    const standard = contrastRatio(resolveTextColor(palette.rustInk, false), palette.paper);
    const raised = contrastRatio(resolveTextColor(palette.rustInk, true), palette.paper);
    expect(raised).toBeGreaterThan(standard);
  });

  it('leaves colours that are already legible untouched', () => {
    expect(resolveTextColor(palette.paper, false)).toBe(palette.paper);
    expect(resolveTextColor(palette.white, true)).toBe(palette.white);
  });

  it('holds the thresholds the rest of the suite relies on', () => {
    expect(AA_TEXT).toBe(4.5);
    expect(AA_LARGE_TEXT).toBe(3);
  });
});

describe('phase 14 · type and touch floors', () => {
  it('never prints text below 12 points', () => {
    for (const size of Object.values(typeRamp.size)) {
      expect(size).toBeGreaterThanOrEqual(12);
    }
  });

  it('gives every type size room to breathe', () => {
    const sizes = typeRamp.size;
    const heights = typeRamp.lineHeight;
    expect(heights.caption).toBeGreaterThan(sizes.caption);
    expect(heights.body).toBeGreaterThan(sizes.body);
    expect(heights.display).toBeGreaterThan(sizes.display);
  });

  it('lets body copy scale further than display type', () => {
    expect(MAX_FONT_SCALE.body).toBeGreaterThan(MAX_FONT_SCALE.display);
    expect(MAX_FONT_SCALE.display).toBeGreaterThan(1);
    // Printed card faces still move a little, just not enough to overflow.
    expect(FIXED_SURFACE_FONT_SCALE).toBeGreaterThan(1);
    expect(FIXED_SURFACE_FONT_SCALE).toBeLessThan(MAX_FONT_SCALE.body);
  });

  it('keeps touch targets at or above the platform minimum', () => {
    expect(touch.minTarget).toBeGreaterThanOrEqual(44);
    expect(touch.comfortableTarget).toBeGreaterThanOrEqual(touch.minTarget);
    expect(touch.hitSlop.top).toBeGreaterThan(0);
  });
});
