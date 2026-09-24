import { createMockBillingAdapter } from './mockBillingAdapter';
import { createPlatformBillingAdapter } from './platformBillingAdapter';
import type { BillingAdapter } from './purchaseTypes';

/**
 * WHICH STOREFRONT IS THE APP TALKING TO?
 *
 * One rule, and it errs on the side of not charging anyone:
 *
 * - In development, the **mock** adapter runs, so the whole acquisition flow
 *   — products, purchase, restore, entitlement grant, unlock — is exercisable
 *   end to end without money, accounts, or a native build.
 * - In a release build, the **platform** adapter runs. It is not configured, so
 *   it reports itself unavailable and the anthology says so plainly instead of
 *   staging a fake transaction.
 *
 * There is no third branch that silently sells something. When real billing is
 * wired up, `createPlatformBillingAdapter` gains an implementation and this
 * function does not change.
 */

let cached: BillingAdapter | null = null;

export function resolveBillingAdapter(): BillingAdapter {
  if (cached) return cached;

  cached = __DEV__
    ? createMockBillingAdapter({ latencyMs: 700 })
    : createPlatformBillingAdapter();

  return cached;
}

/** Test seam: replaces the process-wide adapter. */
export function setBillingAdapter(adapter: BillingAdapter | null) {
  cached = adapter;
}
