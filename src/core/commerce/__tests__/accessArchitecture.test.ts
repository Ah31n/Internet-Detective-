import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PRODUCT_CATALOG } from '../catalog';

/**
 * A STANDING CHECK ON THE ARCHITECTURE
 *
 * The rule for this phase is that no screen is hardcoded to a purchase state.
 * That is easy to state and easy to erode — one `if (grants.includes(...))` in
 * a screen and the abstraction is gone. So it is enforced here, by reading the
 * source, rather than left to review.
 *
 * Exactly two places are allowed to know about products and grants: the
 * anthology, which sells them, and the developer panel, which fakes them.
 */

const SRC = join(process.cwd(), 'src');

const SELLING_SURFACES = [
  'src/features/store',
  'src/core/commerce',
  'src/state/entitlement.store.ts',
  'src/core/bootstrap/useAppBootstrap.ts',
  // Developer QA surface. Eliminated from release builds entirely, and held
  // to that by the tests in src/core/dev/__tests__.
  'src/core/dev',
  'src/features/qa',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(full) && !full.includes('__tests__') ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: path.replace(`${process.cwd()}/`, ''),
  source: readFileSync(path, 'utf8'),
}));

const outsideSellingSurfaces = files.filter(
  (file) => !SELLING_SURFACES.some((allowed) => file.path.startsWith(allowed)),
);

describe('phase 15 · access architecture', () => {
  it('finds the source it is auditing', () => {
    expect(files.length).toBeGreaterThan(60);
    expect(outsideSellingSurfaces.length).toBeGreaterThan(40);
  });

  it('keeps the entitlement store out of every screen but the anthology', () => {
    const leaks = outsideSellingSurfaces
      .filter((file) => file.source.includes('entitlement.store'))
      .map((file) => file.path);
    expect(leaks, leaks.join('\n')).toEqual([]);
  });

  it('never names a product id outside the store layer', () => {
    const ids = PRODUCT_CATALOG.map((product) => product.id);
    const leaks = outsideSellingSurfaces
      .filter((file) => ids.some((id) => file.source.includes(id)))
      .map((file) => file.path);
    expect(leaks, leaks.join('\n')).toEqual([]);
  });

  it('never compares a case to an entitlement id by hand', () => {
    // `case:001` written into a screen is the exact mistake this phase exists
    // to prevent: it would survive the case becoming part of a bundle, and
    // then quietly lock out a player who owns it.
    const leaks = outsideSellingSurfaces
      .filter((file) => /['"`](case|season|complete):[\w-]+['"`]/.test(file.source))
      .map((file) => file.path);
    expect(leaks, leaks.join('\n')).toEqual([]);
  });

  it('routes every access decision through the access layer', () => {
    const askers = files.filter((file) =>
      /useCanAccessCase|useCaseAvailability|useCaseLibrary|canAccessCase/.test(
        file.source,
      ),
    );
    expect(askers.length).toBeGreaterThan(2);
  });

  it('contains no billing SDK and no credentials anywhere in the commerce layer', () => {
    const commerce = files.filter((file) => file.path.startsWith('src/core/commerce'));
    for (const file of commerce) {
      // Prose naming the libraries a future implementation would use is
      // fine; an actual import of one is not.
      expect(file.source, file.path).not.toMatch(
        /(from|require\()\s*['"](react-native-iap|expo-iap|expo-in-app-purchases)['"]/,
      );
      expect(file.source, file.path).not.toMatch(
        /(api[_-]?key|client[_-]?secret|shared[_-]?secret|private[_-]?key)\s*[:=]/i,
      );
    }
  });

  it('ships no advertising, energy, or timed-monetization machinery', () => {
    const forbidden =
      /AdMob|admob|rewarded[_ ]?ad|interstitial|energyRefill|livesRemaining|lootBox|gacha/;
    const offenders = files
      .filter((file) => forbidden.test(file.source))
      .map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
