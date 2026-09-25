import { describe, expect, it } from 'vitest';

import { readSourceFiles } from '@/test-support/projectRoot';

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

/**
 * The only two places allowed to know the entitlement store exists.
 *
 * This list used to also contain `src/features/store`, `src/features/qa`,
 * `src/core/dev`, and `src/core/bootstrap/useAppBootstrap.ts` — four surfaces
 * that were reaching past the commerce layer into persistence directly. They
 * now go through the domain API (`useAnthology`, `useEntitlementSnapshot`,
 * `useEntitlementsHydrated`, `applyDeveloperGrant`), so the allowlist could be
 * cut back to the layer boundary itself.
 */
const SELLING_SURFACES = ['src/core/commerce', 'src/state/entitlement.store.ts'];

// Anchored on the module's own location, never on the working directory: a
// wrong cwd used to make every allowlist entry stop matching, reporting all
// 152 project files as architecture leaks.
const files = readSourceFiles('src');

const outsideSellingSurfaces = files.filter(
  (file) => !SELLING_SURFACES.some((allowed) => file.path.startsWith(allowed)),
);

describe('phase 15 · access architecture', () => {
  it('keeps the allowlist at the layer boundary', () => {
    // An allowlist is only as good as its discipline. Widening it is the
    // easiest way to make a genuine leak pass, so the shape of the list is
    // itself asserted: the commerce layer, and the store it owns. Nothing else
    // may be added without this failing first.
    expect(SELLING_SURFACES).toEqual([
      'src/core/commerce',
      'src/state/entitlement.store.ts',
    ]);
  });

  it('routes every other surface through the domain API', () => {
    // The four surfaces that used to be exempt now consume the commerce layer.
    const throughDomainApi: readonly [string, string][] = [
      ['src/features/store/screens/ContentStoreScreen.tsx', 'useAnthology'],
      ['src/features/qa/screens/QAConsoleScreen.tsx', 'useEntitlementSnapshot'],
      ['src/core/bootstrap/useAppBootstrap.ts', 'useEntitlementsHydrated'],
      ['src/core/dev/qaTools.ts', 'applyDeveloperGrant'],
    ];
    for (const [path, api] of throughDomainApi) {
      const file = files.find((candidate) => candidate.path === path);
      expect(file, path).toBeDefined();
      expect(file!.source, `${path} must use ${api}`).toContain(api);
    }
  });

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
