import { PRODUCT_CATALOG, type ProductDefinition, type ProductId } from '../catalog';
import type { EntitlementGrant } from '../entitlements';
import { mergeGrants } from '../entitlements';
import type {
  BillingAdapter,
  PurchaseOutcome,
  RestoreOutcome,
  StoreProduct,
} from './purchaseTypes';
import { grantsFromReceipt } from './purchaseTypes';

/**
 * PURCHASE SERVICE
 *
 * Sits between the adapter and the store of record, and does the one job the
 * adapter must not: turning an outcome into claims, without ever losing one.
 *
 * Pure with respect to state — it takes the grants it is given and returns new
 * ones. The zustand store owns persistence; this owns the rules.
 */

export interface ShelfEntry {
  product: ProductDefinition;
  /** Localized price when the platform answered, catalog copy otherwise. */
  price: string;
  /** True when the price came from the platform rather than the fallback. */
  priceIsLocalized: boolean;
  owned: boolean;
  purchasable: boolean;
}

export interface PurchaseResolution {
  outcome: PurchaseOutcome;
  grants: readonly EntitlementGrant[];
  /** Quiet, factual line for the player. Never celebratory, never pushy. */
  message: string;
}

export interface RestoreResolution {
  outcome: RestoreOutcome;
  grants: readonly EntitlementGrant[];
  message: string;
}

export function buildShelf(
  storeProducts: readonly StoreProduct[],
  ownedProductIds: readonly string[],
  billingAvailable: boolean,
): readonly ShelfEntry[] {
  const localized = new Map(storeProducts.map((item) => [item.id, item]));

  return PRODUCT_CATALOG.map((product) => {
    const platform = localized.get(product.id);
    return {
      product,
      price: platform?.displayPrice ?? product.fallbackPrice,
      priceIsLocalized: platform !== undefined,
      owned: ownedProductIds.includes(product.id),
      purchasable: billingAvailable && product.availability === 'available',
    };
  });
}

export async function purchaseProduct(
  adapter: BillingAdapter,
  productId: ProductId,
  existingGrants: readonly EntitlementGrant[],
): Promise<PurchaseResolution> {
  const outcome = await adapter.purchase(productId);

  switch (outcome.kind) {
    case 'purchased':
      return {
        outcome,
        grants: mergeGrants(existingGrants, grantsFromReceipt(outcome.receipt, 'purchase')),
        message: 'Added to your collection.',
      };
    case 'already-owned':
      return {
        outcome,
        // Re-granting is harmless: the merge keeps the original date.
        grants: mergeGrants(existingGrants, grantsFromReceipt(outcome.receipt, 'restore')),
        message: 'Already in your collection.',
      };
    case 'cancelled':
      return { outcome, grants: existingGrants, message: 'Cancelled.' };
    case 'unavailable':
      return { outcome, grants: existingGrants, message: outcome.message };
    case 'failed':
      return { outcome, grants: existingGrants, message: outcome.message };
  }
}

export async function restorePurchases(
  adapter: BillingAdapter,
  existingGrants: readonly EntitlementGrant[],
): Promise<RestoreResolution> {
  const outcome = await adapter.restore();

  switch (outcome.kind) {
    case 'restored': {
      const restored = outcome.receipts.flatMap((receipt) =>
        grantsFromReceipt(receipt, 'restore'),
      );
      const grants = mergeGrants(existingGrants, restored);
      const added = grants.length - existingGrants.length;
      return {
        outcome,
        grants,
        message:
          added > 0
            ? `Restored ${added} item${added === 1 ? '' : 's'}.`
            : 'Your collection was already complete.',
      };
    }
    case 'nothing-to-restore':
      return {
        outcome,
        grants: existingGrants,
        message: 'No previous purchases found on this account.',
      };
    case 'unavailable':
    case 'failed':
      return { outcome, grants: existingGrants, message: outcome.message };
  }
}
