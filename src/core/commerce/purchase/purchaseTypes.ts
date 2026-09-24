import type { EntitlementGrant, EntitlementId } from '../entitlements';
import type { ProductId } from '../catalog';

/**
 * PURCHASE CONTRACTS
 *
 * The boundary between the game and whatever is selling things. Everything the
 * app knows about billing is described here; the implementations behind it are
 * swappable, and one of them is a mock.
 *
 * Nothing in this file imports a billing SDK, and no credentials, keys, or
 * shared secrets exist anywhere in this repository.
 */

/**
 * Which billing world an adapter is talking to. Surfaced in the UI so a
 * development build can never be mistaken for a real transaction.
 */
export type BillingEnvironment = 'mock' | 'sandbox' | 'production';

/** A product as the *platform* describes it, with localized pricing. */
export interface StoreProduct {
  id: ProductId;
  /** Localized, e.g. "£3.99". Authoritative when present. */
  displayPrice: string;
  priceAmountMicros: number;
  currencyCode: string;
  /** Platform-provided title, when the store returns one. */
  storeTitle: string | null;
}

export interface PurchaseReceipt {
  productId: ProductId;
  entitlements: readonly EntitlementId[];
  transactionId: string;
  purchasedAtEpochMs: number;
  environment: BillingEnvironment;
}

/**
 * Every way a purchase can end. Cancellation is a first-class, unremarkable
 * outcome — not an error, and never something to nag the player about.
 */
export type PurchaseOutcome =
  | { kind: 'purchased'; receipt: PurchaseReceipt }
  | { kind: 'already-owned'; receipt: PurchaseReceipt }
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'failed'; message: string };

export type RestoreOutcome =
  | { kind: 'restored'; receipts: readonly PurchaseReceipt[] }
  | { kind: 'nothing-to-restore' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'failed'; message: string };

/**
 * The port every billing implementation fills.
 *
 * Deliberately tiny. A larger surface would leak store-specific concepts
 * (consumables, subscription renewal, proration) into a game that has, by
 * design, none of them.
 */
export interface BillingAdapter {
  readonly id: string;
  readonly environment: BillingEnvironment;
  /** False when this build cannot transact — the honest default. */
  isAvailable(): Promise<boolean>;
  listProducts(productIds: readonly ProductId[]): Promise<readonly StoreProduct[]>;
  purchase(productId: ProductId): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
}

/** Turns a receipt into the claims it confers. */
export function grantsFromReceipt(
  receipt: PurchaseReceipt,
  source: 'purchase' | 'restore',
): readonly EntitlementGrant[] {
  return receipt.entitlements.map((id) => ({
    id,
    source,
    grantedAtEpochMs: receipt.purchasedAtEpochMs,
    productId: receipt.productId,
  }));
}

export type PurchasePhase =
  | 'idle'
  | 'loading-products'
  | 'purchasing'
  | 'restoring';
