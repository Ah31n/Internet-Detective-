import { describe, expect, it } from 'vitest';

import { PRODUCT_CATALOG } from '../catalog';
import { resolveCaseAvailability, type AccessContext } from '../caseAccess';
import type { EntitlementGrant } from '../entitlements';
import { createMockBillingAdapter } from '../purchase/mockBillingAdapter';
import { createPlatformBillingAdapter } from '../purchase/platformBillingAdapter';
import {
  buildShelf,
  purchaseProduct,
  restorePurchases,
} from '../purchase/purchaseService';

/**
 * These tests drive the acquisition flow end to end — product listing,
 * purchase, cancellation, failure, restore, and the entitlement grant that
 * results — entirely through the mock adapter. No network, no store account,
 * no money, and a fixed clock, so the sequence is identical every run.
 */

const clock = () => 1_700_000_000_000;

/**
 * The catalog ships every product as `announced`, so the flow is exercised
 * against a locally published one.
 */
const sellableAdapter = () =>
  createMockBillingAdapter({ now: clock, published: ['product.season.01'] });

describe('mock billing adapter', () => {
  it('reports itself available and lists the catalog', async () => {
    const adapter = createMockBillingAdapter({ now: clock });
    expect(await adapter.isAvailable()).toBe(true);

    const products = await adapter.listProducts(
      PRODUCT_CATALOG.map((product) => product.id),
    );
    expect(products).toHaveLength(PRODUCT_CATALOG.length);
    expect(products[0]?.displayPrice).toMatch(/^\$/);
  });

  it('refuses to sell a case that has not been published', async () => {
    const adapter = createMockBillingAdapter({ now: clock });
    const outcome = await adapter.purchase('product.case.002');
    expect(outcome.kind).toBe('unavailable');
  });

  it('reports cancellation as an ordinary outcome', async () => {
    const adapter = createMockBillingAdapter({
      now: clock,
      random: () => 0,
      cancellationRate: 1,
      published: ['product.season.01'],
    });
    const outcome = await adapter.purchase('product.season.01');
    expect(outcome.kind).toBe('cancelled');
  });

  it('has nothing to restore on a fresh account', async () => {
    const adapter = createMockBillingAdapter({ now: clock });
    expect((await adapter.restore()).kind).toBe('nothing-to-restore');
  });

  it('restores what a previous install bought', async () => {
    const adapter = createMockBillingAdapter({
      now: clock,
      initialOwned: ['product.season.01'],
    });
    const outcome = await adapter.restore();
    expect(outcome.kind).toBe('restored');
    if (outcome.kind === 'restored') {
      expect(outcome.receipts[0]?.entitlements).toEqual(['season:01']);
    }
  });
});

describe('the unconfigured platform adapter', () => {
  it('declines everything honestly rather than faking a sale', async () => {
    const adapter = createPlatformBillingAdapter();
    expect(await adapter.isAvailable()).toBe(false);
    expect(await adapter.listProducts(['product.season.01'])).toEqual([]);

    const purchase = await adapter.purchase('product.season.01');
    expect(purchase.kind).toBe('unavailable');

    const restore = await adapter.restore();
    expect(restore.kind).toBe('unavailable');
  });
});

describe('purchase service', () => {
  it('turns a season purchase into a claim, and the claim into access', async () => {
    const adapter = sellableAdapter();
    const resolution = await purchaseProduct(adapter, 'product.season.01', []);

    expect(resolution.outcome.kind).toBe('purchased');
    expect(resolution.grants.map((grant) => grant.id)).toEqual(['season:01']);
    expect(resolution.message).toBe('Added to your collection.');

    // The whole point: one purchase, and the access layer answers differently.
    const context: AccessContext = {
      grants: resolution.grants,
      installedDefinitionIds: ['case-001-missing-diamond'],
    };
    expect(resolveCaseAvailability('case-004', context)?.entitled).toBe(true);
  });

  it('keeps a cancelled purchase silent and unchanged', async () => {
    const adapter = createMockBillingAdapter({
      now: clock,
      random: () => 0,
      cancellationRate: 1,
      published: ['product.season.01'],
    });
    const existing: readonly EntitlementGrant[] = [];
    const resolution = await purchaseProduct(adapter, 'product.season.01', existing);
    expect(resolution.grants).toBe(existing);
  });

  it('reports a transport failure without granting anything', async () => {
    const adapter = createMockBillingAdapter({ now: clock, unavailable: true });
    const resolution = await purchaseProduct(adapter, 'product.season.01', []);
    expect(resolution.outcome.kind).toBe('unavailable');
    expect(resolution.grants).toEqual([]);
  });

  it('never double-charges an owner: a second purchase is already-owned', async () => {
    const adapter = createMockBillingAdapter({
      now: clock,
      initialOwned: ['product.season.01'],
    });
    const resolution = await purchaseProduct(adapter, 'product.season.01', []);
    expect(resolution.outcome.kind).toBe('already-owned');
    expect(resolution.grants.map((grant) => grant.id)).toEqual(['season:01']);
  });

  it('restores into existing grants without losing the original date', async () => {
    const adapter = createMockBillingAdapter({
      now: clock,
      initialOwned: ['product.season.01'],
    });
    const existing: readonly EntitlementGrant[] = [
      { id: 'season:01', source: 'purchase', grantedAtEpochMs: 5, productId: null },
    ];
    const resolution = await restorePurchases(adapter, existing);

    expect(resolution.outcome.kind).toBe('restored');
    expect(resolution.grants).toHaveLength(1);
    expect(resolution.grants[0]?.grantedAtEpochMs).toBe(5);
    expect(resolution.message).toBe('Your collection was already complete.');
  });

  it('says plainly when there is nothing to restore', async () => {
    const adapter = createMockBillingAdapter({ now: clock });
    const resolution = await restorePurchases(adapter, []);
    expect(resolution.message).toBe(
      'No previous purchases found on this account.',
    );
  });
});

describe('the shelf', () => {
  it('falls back to catalog pricing until the platform answers', () => {
    const shelf = buildShelf([], [], false);
    expect(shelf).toHaveLength(PRODUCT_CATALOG.length);
    expect(shelf.every((entry) => !entry.priceIsLocalized)).toBe(true);
    expect(shelf.every((entry) => !entry.purchasable)).toBe(true);
  });

  it('prefers localized pricing when the platform provides it', () => {
    const shelf = buildShelf(
      [
        {
          id: 'product.season.01',
          displayPrice: '£12.99',
          priceAmountMicros: 12_990_000,
          currencyCode: 'GBP',
          storeTitle: 'Season One',
        },
      ],
      ['product.season.01'],
      true,
    );
    const season = shelf.find((entry) => entry.product.id === 'product.season.01');
    expect(season?.price).toBe('£12.99');
    expect(season?.priceIsLocalized).toBe(true);
    expect(season?.owned).toBe(true);
  });
});
