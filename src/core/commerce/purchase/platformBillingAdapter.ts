import type {
  BillingAdapter,
  PurchaseOutcome,
  RestoreOutcome,
} from './purchaseTypes';

/**
 * PLATFORM BILLING ADAPTER — NOT WIRED
 *
 * This build contains no billing SDK, no StoreKit configuration, no Play
 * Billing library, and no product registrations. Rather than pretend
 * otherwise, this adapter reports itself unavailable and the store prints an
 * honest line to the player. It is the seam, not the implementation.
 *
 * What real billing needs, when the project is ready for it:
 *
 * 1. A billing library with native code (`expo-iap` or `react-native-iap`),
 *    installed with `npx expo install`, which requires a development build —
 *    Expo Go cannot transact.
 * 2. Products registered in App Store Connect and Google Play Console under
 *    the identifiers already declared in `catalog.ts` (`storeIds`), as
 *    **non-consumable** items. Nothing in this game is consumable.
 * 3. A local StoreKit configuration file for the iOS simulator, and a licence
 *    tester account for Android.
 * 4. Server-side receipt validation before a grant is trusted on a new device.
 *    Until that exists, restore is the only recovery path and grants are local.
 *
 * Only the body of this file changes when that day comes. `canAccessCase`,
 * every screen, and the entitlement model stay exactly as they are — which is
 * the reason the seam exists.
 */

const NOT_CONFIGURED =
  'Platform billing is not configured in this build.';

export function createPlatformBillingAdapter(): BillingAdapter {
  return {
    id: 'platform-unconfigured',
    environment: 'production',

    async isAvailable() {
      return false;
    },

    async listProducts() {
      return [];
    },

    async purchase(): Promise<PurchaseOutcome> {
      return { kind: 'unavailable', message: NOT_CONFIGURED };
    },

    async restore(): Promise<RestoreOutcome> {
      return { kind: 'unavailable', message: NOT_CONFIGURED };
    },
  };
}
