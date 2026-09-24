import { PRODUCT_CATALOG, getProduct, type ProductId } from '../catalog';
import type {
  BillingAdapter,
  PurchaseOutcome,
  PurchaseReceipt,
  RestoreOutcome,
  StoreProduct,
} from './purchaseTypes';

/**
 * MOCK BILLING ADAPTER
 *
 * A development stand-in that behaves like a storefront without being one: it
 * takes time to respond, it can be cancelled, it can fail, and it remembers
 * what it sold so that "restore" has something truthful to return.
 *
 * Every non-deterministic input — the clock, the dice, the delay — is injected,
 * so tests drive it exactly and the same sequence always produces the same
 * result. It sells nothing and charges nothing.
 */

export interface MockBillingOptions {
  /** Simulated round trip, in milliseconds. Zero in tests. */
  latencyMs?: number;
  now?: () => number;
  /** Deterministic 0–1 source used for the simulated failure paths. */
  random?: () => number;
  /** Probability a purchase reports a transport failure. Zero by default. */
  failureRate?: number;
  /** Probability the player dismisses the sheet. Zero by default. */
  cancellationRate?: number;
  /** Purchases already on the account before this session. */
  initialOwned?: readonly ProductId[];
  /**
   * Treats these as published even while the catalog still lists them as
   * announced — the only way to exercise the acquisition flow before the
   * series actually goes on sale.
   */
  published?: readonly ProductId[];
  /** Makes the whole adapter report itself unavailable. */
  unavailable?: boolean;
}

const wait = (ms: number) =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

export interface MockBillingAdapter extends BillingAdapter {
  /** Test and developer-tools affordance: what this account currently owns. */
  ownedProducts(): readonly ProductId[];
  clear(): void;
}

export function createMockBillingAdapter(
  options: MockBillingOptions = {},
): MockBillingAdapter {
  const {
    latencyMs = 0,
    now = () => Date.now(),
    random = () => 1,
    failureRate = 0,
    cancellationRate = 0,
    unavailable = false,
    published = [],
  } = options;

  const owned = new Map<ProductId, PurchaseReceipt>();
  let sequence = 0;

  const receiptFor = (productId: ProductId): PurchaseReceipt => {
    const product = getProduct(productId)!;
    sequence += 1;
    return {
      productId,
      entitlements: product.grants,
      transactionId: `mock-${productId}-${sequence}`,
      purchasedAtEpochMs: now(),
      environment: 'mock',
    };
  };

  for (const productId of options.initialOwned ?? []) {
    if (getProduct(productId)) owned.set(productId, receiptFor(productId));
  }

  return {
    id: 'mock',
    environment: 'mock',

    async isAvailable() {
      await wait(latencyMs);
      return !unavailable;
    },

    async listProducts(productIds) {
      await wait(latencyMs);
      if (unavailable) return [];

      const requested = new Set<string>(productIds);
      return PRODUCT_CATALOG.filter((product) => requested.has(product.id)).map(
        (product): StoreProduct => ({
          id: product.id,
          displayPrice: product.fallbackPrice,
          priceAmountMicros:
            Math.round(Number(product.fallbackPrice.replace(/[^0-9.]/g, '')) * 100) *
            10_000,
          currencyCode: 'USD',
          storeTitle: product.title,
        }),
      );
    },

    async purchase(productId): Promise<PurchaseOutcome> {
      await wait(latencyMs);

      if (unavailable) {
        return {
          kind: 'unavailable',
          message: 'Acquisition is not open on this build.',
        };
      }

      const product = getProduct(productId);
      if (!product) {
        return { kind: 'failed', message: `Unknown product ${productId}.` };
      }

      // Ownership is checked before publication: something bought while it was
      // on sale stays owned even if it is later withdrawn.
      const existing = owned.get(productId);
      if (existing) return { kind: 'already-owned', receipt: existing };

      if (product.availability !== 'available' && !published.includes(productId)) {
        return {
          kind: 'unavailable',
          message: `${product.title} has not been published yet.`,
        };
      }

      if (random() < cancellationRate) return { kind: 'cancelled' };
      if (random() < failureRate) {
        return { kind: 'failed', message: 'The store did not respond.' };
      }

      const receipt = receiptFor(productId);
      owned.set(productId, receipt);
      return { kind: 'purchased', receipt };
    },

    async restore(): Promise<RestoreOutcome> {
      await wait(latencyMs);

      if (unavailable) {
        return {
          kind: 'unavailable',
          message: 'Acquisition is not open on this build.',
        };
      }
      if (owned.size === 0) return { kind: 'nothing-to-restore' };
      return { kind: 'restored', receipts: [...owned.values()] };
    },

    ownedProducts() {
      return [...owned.keys()];
    },

    clear() {
      owned.clear();
    },
  };
}
