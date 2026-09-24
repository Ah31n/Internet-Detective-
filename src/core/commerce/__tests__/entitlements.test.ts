import { describe, expect, it } from 'vitest';

import {
  BUNDLED_ENTITLEMENTS,
  CASE_CATALOG,
  ENTITLEMENT_DEFINITIONS,
  ENTITLEMENT_INDEX,
  PRODUCT_CATALOG,
  productsGranting,
} from '../catalog';
import {
  expandEntitlements,
  indexEntitlements,
  isEntitlementId,
  mergeGrants,
  parseEntitlementId,
  resolveHeldEntitlements,
  sanitizeGrants,
  type EntitlementGrant,
} from '../entitlements';

const grant = (
  id: EntitlementGrant['id'],
  at: number,
  source: EntitlementGrant['source'] = 'purchase',
): EntitlementGrant => ({
  id,
  source,
  grantedAtEpochMs: at,
  productId: null,
});

describe('entitlement ids', () => {
  it('parses each supported scope', () => {
    expect(parseEntitlementId('case:001')).toEqual({ scope: 'case', key: '001' });
    expect(parseEntitlementId('season:01')).toEqual({ scope: 'season', key: '01' });
    expect(parseEntitlementId('complete:edition')).toEqual({
      scope: 'complete',
      key: 'edition',
    });
  });

  it('rejects malformed ids without throwing', () => {
    for (const value of ['', 'case', 'case:', ':001', 'unknown:001', 'case 001']) {
      expect(parseEntitlementId(value), value).toBeNull();
      expect(isEntitlementId(value), value).toBe(false);
    }
  });
});

describe('entitlement expansion', () => {
  it('resolves a season into its cases', () => {
    const held = expandEntitlements(['season:01'], ENTITLEMENT_INDEX);
    expect(held.has('case:001')).toBe(true);
    expect(held.has('case:006')).toBe(true);
    expect(held.has('complete:edition')).toBe(false);
  });

  it('resolves the complete edition transitively', () => {
    const held = expandEntitlements(['complete:edition'], ENTITLEMENT_INDEX);
    for (const entry of CASE_CATALOG) {
      expect(held.has(entry.entitlement), entry.id).toBe(true);
    }
  });

  it('tolerates unknown ids', () => {
    const held = expandEntitlements(['case:999'], ENTITLEMENT_INDEX);
    expect([...held]).toEqual(['case:999']);
  });

  it('terminates on a cyclic catalog', () => {
    const cyclic = indexEntitlements([
      { id: 'season:01', title: 'a', description: '', includes: ['season:02'] },
      { id: 'season:02', title: 'b', description: '', includes: ['season:01'] },
    ]);
    expect([...expandEntitlements(['season:01'], cyclic)].sort()).toEqual([
      'season:01',
      'season:02',
    ]);
  });

  it('always includes bundled claims, even with no grants at all', () => {
    const held = resolveHeldEntitlements([], BUNDLED_ENTITLEMENTS, ENTITLEMENT_INDEX);
    expect(held.has('case:001')).toBe(true);
    expect(held.has('case:002')).toBe(false);
  });
});

describe('merging grants', () => {
  it('keeps the earliest date when a claim is granted twice', () => {
    const merged = mergeGrants(
      [grant('case:002', 1_000)],
      [grant('case:002', 9_000, 'restore')],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.grantedAtEpochMs).toBe(1_000);
  });

  it('never drops a claim', () => {
    const merged = mergeGrants(
      [grant('case:002', 1_000)],
      [grant('season:01', 2_000), grant('case:003', 3_000)],
    );
    expect(merged.map((item) => item.id)).toEqual([
      'case:002',
      'season:01',
      'case:003',
    ]);
  });
});

describe('persisted grant recovery', () => {
  it('drops corrupt entries and keeps valid ones', () => {
    const recovered = sanitizeGrants([
      { id: 'case:002', source: 'purchase', grantedAtEpochMs: 5, productId: null },
      { id: 'nonsense', source: 'purchase', grantedAtEpochMs: 5 },
      null,
      42,
      { id: 'season:01' },
    ]);
    expect(recovered.map((item) => item.id)).toEqual(['case:002', 'season:01']);
    expect(recovered[1]?.grantedAtEpochMs).toBe(0);
  });

  it('returns nothing for a non-array', () => {
    expect(sanitizeGrants(undefined)).toEqual([]);
    expect(sanitizeGrants({ grants: [] })).toEqual([]);
  });
});

describe('catalog integrity', () => {
  it('publishes the six announced cases in printed order', () => {
    expect(CASE_CATALOG.map((entry) => entry.number)).toEqual([
      '001',
      '002',
      '003',
      '004',
      '005',
      '006',
    ]);
  });

  it('ships exactly one released case, and case 001 is it', () => {
    const released = CASE_CATALOG.filter((entry) => entry.release === 'released');
    expect(released.map((entry) => entry.id)).toEqual(['case-001']);
    expect(released[0]?.definitionId).toBe('case-001-missing-diamond');
  });

  it('gives every case a defined, unique entitlement', () => {
    const ids = CASE_CATALOG.map((entry) => entry.entitlement);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(ENTITLEMENT_INDEX.has(id), id).toBe(true);
    }
  });

  it('never announces an unwritten case as installed', () => {
    for (const entry of CASE_CATALOG) {
      if (entry.release === 'announced') expect(entry.definitionId).toBeNull();
    }
  });

  it('grants only entitlements the catalog defines', () => {
    for (const product of PRODUCT_CATALOG) {
      for (const granted of product.grants) {
        expect(ENTITLEMENT_INDEX.has(granted), granted).toBe(true);
      }
    }
  });

  it('declares platform product identifiers without any credentials', () => {
    const serialized = JSON.stringify(PRODUCT_CATALOG);
    expect(serialized).not.toMatch(/secret|api[_-]?key|token|password/i);
    for (const product of PRODUCT_CATALOG) {
      expect(product.storeIds.ios.length).toBeGreaterThan(0);
      expect(product.storeIds.android.length).toBeGreaterThan(0);
    }
  });

  it('keeps case 001 free: no product sells it on its own', () => {
    const soloSellers = PRODUCT_CATALOG.filter(
      (product) => product.grants.length === 1 && product.grants[0] === 'case:001',
    );
    expect(soloSellers).toEqual([]);
    expect(BUNDLED_ENTITLEMENTS).toContain('case:001');
  });

  it('offers a bundle route for every paid case', () => {
    for (const entry of CASE_CATALOG) {
      if (entry.entitlement === 'case:001') continue;
      const routes = productsGranting(entry.entitlement).map((item) => item.id);
      expect(routes, entry.id).toContain('product.season.01');
      expect(routes, entry.id).toContain('product.complete.edition');
    }
  });

  it('contains no consumable, renewable, or timed product', () => {
    // "no renewal" is allowed; an actual renewal is not.
    const forbidden =
      /consumable|auto-?renew|subscription|per month|per year|energy|coins?\b|gems?\b|loot|timer/i;
    for (const product of PRODUCT_CATALOG) {
      expect(`${product.title} ${product.description}`, product.id).not.toMatch(
        forbidden,
      );
      expect(['case', 'season', 'edition']).toContain(product.kind);
    }
    expect(ENTITLEMENT_DEFINITIONS.every((item) => item.id.includes(':'))).toBe(true);
  });
});
