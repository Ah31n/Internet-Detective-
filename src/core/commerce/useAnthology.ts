import { useCallback, useMemo } from 'react';

import {
  selectIsBusy,
  selectShelf,
  useEntitlementStore,
} from '@/state/entitlement.store';

import { BUNDLED_ENTITLEMENTS, ENTITLEMENT_INDEX } from './catalog';
import {
  resolveHeldEntitlements,
  type EntitlementGrant,
  type EntitlementId,
} from './entitlements';
import type { ProductId } from './catalog';
import type { ShelfEntry } from './purchase/purchaseService';
import type { PurchasePhase } from './purchase/purchaseTypes';

/**
 * THE COMMERCE DOMAIN API
 *
 * The one place outside `src/state` that is allowed to touch the entitlement
 * store, and the layer every screen goes through instead.
 *
 * The dependency direction the architecture intends is:
 *
 *     screen  ->  domain API (this file, useCaseAccess)
 *                     ->  commerce layer (catalog, entitlements, purchase)
 *                             ->  entitlement store
 *
 * The anthology screen used to reach straight past all of that and pull nine
 * separate slices out of the store — shelf, phase, message, billing
 * environment, products-loaded, and three actions. That made a screen a direct
 * consumer of persistence: renaming a store field, changing how "busy" is
 * derived, or moving purchase bookkeeping meant editing UI. It also meant the
 * screen, not the commerce layer, decided what a store surface may know.
 *
 * Nothing about behaviour changes here. The same state and the same actions
 * are exposed, named for what the store *is* rather than for how it is kept.
 */

export interface AnthologyView {
  /** Collected editions and single cases, with pricing and ownership. */
  shelf: readonly ShelfEntry[];
  /** True while any acquisition or restore is in flight. */
  busy: boolean;
  phase: PurchasePhase;
  /** Quiet status line. Null when there is nothing to say. */
  message: string | null;
  /** True once the platform has been asked for products. */
  productsLoaded: boolean;
  /** Which storefront is answering: mock in development, platform in release. */
  billingEnvironment: string;
  /** True when a development stand-in is serving the shelf. */
  isDevelopmentBilling: boolean;
  loadProducts: () => void;
  purchase: (productId: ProductId) => void;
  restore: () => void;
}

export function useAnthology(): AnthologyView {
  const shelf = useEntitlementStore(selectShelf);
  const busy = useEntitlementStore(selectIsBusy);
  const phase = useEntitlementStore((state) => state.phase);
  const message = useEntitlementStore((state) => state.message);
  const productsLoaded = useEntitlementStore((state) => state.productsLoaded);
  const billingEnvironment = useEntitlementStore(
    (state) => state.billingEnvironment,
  );

  const loadProductsAction = useEntitlementStore((state) => state.loadProducts);
  const purchaseAction = useEntitlementStore((state) => state.purchase);
  const restoreAction = useEntitlementStore((state) => state.restore);

  // The screen should not have to know these return promises it must not await.
  const loadProducts = useCallback(() => {
    void loadProductsAction();
  }, [loadProductsAction]);

  const purchase = useCallback(
    (productId: ProductId) => {
      void purchaseAction(productId);
    },
    [purchaseAction],
  );

  const restore = useCallback(() => {
    void restoreAction();
  }, [restoreAction]);

  return {
    shelf,
    busy,
    phase,
    message,
    productsLoaded,
    billingEnvironment,
    isDevelopmentBilling: billingEnvironment === 'mock',
    loadProducts,
    purchase,
    restore,
  };
}

/**
 * Whether the record of what the player owns has been read back from disk.
 *
 * Bootstrap waits on this so no screen renders against an empty collection and
 * then flickers. Exposed here so the bootstrap sequence depends on the
 * commerce layer rather than on the store's internals.
 */
export function useEntitlementsHydrated(): boolean {
  return useEntitlementStore((state) => state.hasHydrated);
}

/** Read-only view of ownership, for the developer inspector. */
export interface EntitlementSnapshot {
  grants: readonly EntitlementGrant[];
  billingEnvironment: string;
  billingAvailable: boolean;
  /** Every claim held once bundled claims and containment are expanded. */
  heldEntitlementIds: readonly EntitlementId[];
}

export function useEntitlementSnapshot(): EntitlementSnapshot {
  const grants = useEntitlementStore((state) => state.grants);
  const billingEnvironment = useEntitlementStore(
    (state) => state.billingEnvironment,
  );
  const billingAvailable = useEntitlementStore((state) => state.billingAvailable);

  return useMemo(
    () => ({
      grants,
      billingEnvironment,
      billingAvailable,
      heldEntitlementIds: [
        ...resolveHeldEntitlements(
          grants,
          BUNDLED_ENTITLEMENTS,
          ENTITLEMENT_INDEX,
        ),
      ],
    }),
    [billingAvailable, billingEnvironment, grants],
  );
}
