import { useEntitlementStore } from '@/state/entitlement.store';

import { ENTITLEMENT_INDEX } from './catalog';
import type { EntitlementId } from './entitlements';

/**
 * DEVELOPER GRANTS — NAMED, NOT SPELLED OUT
 *
 * QA needs to put the app into "this player owns the premium content" without
 * a purchase. It used to do that by writing the entitlement id directly:
 *
 *     useEntitlementStore.getState().devGrant('complete:edition');
 *
 * Two things wrong with that. The developer tooling became a second place that
 * hard-codes what an id means, so the day the complete edition is renamed or
 * restructured the QA console silently grants something that no longer exists.
 * And it put a raw `scope:key` literal outside the commerce layer, which is
 * exactly the coupling `canAccessCase` exists to prevent — the same mistake as
 * a screen testing for `case:001` by hand, just in a different file.
 *
 * Presets are named for the *situation a tester wants to be in*. The mapping
 * from situation to claim lives here, with the catalog, and is validated
 * against it.
 */

export type DeveloperGrantId = 'premium-complete' | 'season-one';

export interface DeveloperGrantPreset {
  id: DeveloperGrantId;
  /** What the tester is asking for, in their words. */
  label: string;
  description: string;
  entitlement: EntitlementId;
}

export const DEVELOPER_GRANT_PRESETS: readonly DeveloperGrantPreset[] = [
  {
    id: 'premium-complete',
    label: 'SIMULATE PREMIUM ENTITLEMENT',
    description:
      'Grants the complete edition locally, as a developer grant. No purchase is made.',
    entitlement: 'complete:edition',
  },
  {
    id: 'season-one',
    label: 'SIMULATE SEASON ONE',
    description: 'Grants the first season only, to test partial ownership.',
    entitlement: 'season:01',
  },
];

export function getDeveloperGrantPreset(
  id: DeveloperGrantId,
): DeveloperGrantPreset | undefined {
  return DEVELOPER_GRANT_PRESETS.find((preset) => preset.id === id);
}

export interface DeveloperGrantOutcome {
  ok: boolean;
  message: string;
}

/** Applies a named preset. Refuses anything the catalog does not define. */
export function applyDeveloperGrant(
  id: DeveloperGrantId,
): DeveloperGrantOutcome {
  const preset = getDeveloperGrantPreset(id);
  if (!preset) return { ok: false, message: `No developer preset "${id}".` };

  // A preset pointing at an entitlement the catalog has dropped is a bug worth
  // reporting, not a grant worth making.
  if (!ENTITLEMENT_INDEX.has(preset.entitlement)) {
    return {
      ok: false,
      message: `Preset "${id}" names an entitlement the catalog no longer defines.`,
    };
  }

  useEntitlementStore.getState().devGrant(preset.entitlement);
  return {
    ok: true,
    message: `Granted ${preset.entitlement} (source: developer).`,
  };
}

/**
 * Drops every grant. Case 001 stays playable because it is bundled in the
 * catalog rather than granted, so there is no record of it to remove.
 */
export function revokeAllDeveloperGrants(): DeveloperGrantOutcome {
  useEntitlementStore.getState().devResetEntitlements();
  return { ok: true, message: 'All entitlements revoked.' };
}
