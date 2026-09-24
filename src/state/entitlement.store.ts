import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildShelf,
  purchaseProduct,
  resolveBillingAdapter,
  restorePurchases,
  sanitizeGrants,
  type EntitlementGrant,
  type EntitlementId,
  type ProductId,
  type PurchasePhase,
  type ShelfEntry,
  type StoreProduct,
} from '@/core/commerce';
import { PRODUCT_CATALOG } from '@/core/commerce';

import { autosaveStorage } from './persistence/autosaveStorage';

/**
 * THE RECORD OF WHAT THE PLAYER OWNS.
 *
 * Grants are persisted; everything else — phase, shelf, last message — is
 * session state and is deliberately not written to disk. A half-finished
 * purchase must never be able to resurrect itself on next launch.
 *
 * Case 001 is *not* in here. It is bundled in the catalog, so it cannot be
 * lost by clearing storage or by a failed restore.
 */

interface EntitlementState {
  grants: readonly EntitlementGrant[];
  phase: PurchasePhase;
  /** Quiet status line for the anthology. Cleared on the next action. */
  message: string | null;
  billingAvailable: boolean;
  billingEnvironment: string;
  products: readonly StoreProduct[];
  productsLoaded: boolean;
  hasHydrated: boolean;
}

interface EntitlementActions {
  markHydrated: () => void;
  loadProducts: () => Promise<void>;
  purchase: (productId: ProductId) => Promise<void>;
  restore: () => Promise<void>;
  clearMessage: () => void;
  /** Developer tooling. Never reachable from a production build. */
  devGrant: (entitlement: EntitlementId) => void;
  devResetEntitlements: () => void;
}

export type EntitlementStore = EntitlementState & EntitlementActions;
type PersistedEntitlements = Pick<EntitlementState, 'grants'>;

export const ENTITLEMENT_STORAGE_KEY = 'internet-detective.entitlements';
export const ENTITLEMENT_STORE_VERSION = 1;

const initialState: EntitlementState = {
  grants: [],
  phase: 'idle',
  message: null,
  billingAvailable: false,
  billingEnvironment: 'unknown',
  products: [],
  productsLoaded: false,
  hasHydrated: false,
};

export const useEntitlementStore = create<EntitlementStore>()(
  persist<EntitlementStore, [], [], PersistedEntitlements>(
    (set, get) => ({
      ...initialState,

      markHydrated: () => set({ hasHydrated: true }),

      loadProducts: async () => {
        if (get().phase !== 'idle') return;
        const adapter = resolveBillingAdapter();
        set({ phase: 'loading-products', billingEnvironment: adapter.environment });

        const available = await adapter.isAvailable();
        const products = available
          ? await adapter.listProducts(PRODUCT_CATALOG.map((item) => item.id))
          : [];

        set({
          phase: 'idle',
          billingAvailable: available,
          products,
          productsLoaded: true,
        });
      },

      purchase: async (productId) => {
        if (get().phase !== 'idle') return;
        set({ phase: 'purchasing', message: null });

        const resolution = await purchaseProduct(
          resolveBillingAdapter(),
          productId,
          get().grants,
        );

        set({
          phase: 'idle',
          grants: resolution.grants,
          // A cancelled purchase says nothing at all. Silence is the correct
          // response to someone changing their mind.
          message: resolution.outcome.kind === 'cancelled' ? null : resolution.message,
        });
      },

      restore: async () => {
        if (get().phase !== 'idle') return;
        set({ phase: 'restoring', message: null });

        const resolution = await restorePurchases(
          resolveBillingAdapter(),
          get().grants,
        );

        set({
          phase: 'idle',
          grants: resolution.grants,
          message: resolution.message,
        });
      },

      clearMessage: () => set({ message: null }),

      devGrant: (entitlement) =>
        set((state) => ({
          grants: state.grants.some((grant) => grant.id === entitlement)
            ? state.grants
            : [
                ...state.grants,
                {
                  id: entitlement,
                  source: 'developer' as const,
                  grantedAtEpochMs: Date.now(),
                  productId: null,
                },
              ],
        })),

      devResetEntitlements: () => set({ grants: [], message: null }),
    }),
    {
      name: ENTITLEMENT_STORAGE_KEY,
      version: ENTITLEMENT_STORE_VERSION,
      storage: createJSONStorage(() => autosaveStorage),
      merge: (persisted, current) => {
        const source =
          typeof persisted === 'object' && persisted !== null
            ? (persisted as Partial<PersistedEntitlements>)
            : {};
        return { ...current, grants: sanitizeGrants(source.grants) };
      },
      partialize: ({ grants }) => ({ grants }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

export function selectShelf(state: EntitlementStore): readonly ShelfEntry[] {
  const ownedProductIds = state.grants
    .map((grant) => grant.productId)
    .filter((productId): productId is string => productId !== null);
  return buildShelf(state.products, ownedProductIds, state.billingAvailable);
}

export function selectIsBusy(state: EntitlementStore): boolean {
  return state.phase !== 'idle';
}
