import {
  BUNDLED_ENTITLEMENTS,
  CASE_CATALOG,
  ENTITLEMENT_INDEX,
  getCaseCatalogEntry,
  productsGranting,
  type CaseCatalogEntry,
  type ProductDefinition,
} from './catalog';
import {
  resolveHeldEntitlements,
  type EntitlementGrant,
  type EntitlementId,
} from './entitlements';

/**
 * CASE ACCESS
 *
 * One question, asked in one place: **can this player open this case?**
 *
 * No screen is allowed to answer it for itself. A screen that checks a
 * purchase state directly is a screen that will be wrong the day a season
 * bundle, a promotional grant, or a second free case appears. Every caller
 * goes through `canAccessCase` or `resolveCaseAvailability`, both of which are
 * pure functions of (catalog, grants, installed content).
 */

export type CaseAvailabilityStatus =
  | 'playable'
  | 'available'
  | 'locked'
  | 'coming-soon';

export interface CaseAvailability {
  entry: CaseCatalogEntry;
  status: CaseAvailabilityStatus;
  /** Whether the claim is held, independent of whether content is installed. */
  entitled: boolean;
  /** Whether an authored `CaseDefinition` for this entry ships in this build. */
  installed: boolean;
  requiredEntitlement: EntitlementId;
  /** How the case could be obtained, when it can be. */
  offers: readonly ProductDefinition[];
  /** One player-facing line explaining the state. Never a sales pitch. */
  note: string;
}

export interface AccessContext {
  grants: readonly EntitlementGrant[];
  /** Definition ids present in this build, from the case registry. */
  installedDefinitionIds: readonly string[];
  catalog?: readonly CaseCatalogEntry[];
  bundled?: readonly EntitlementId[];
}

/**
 * Resolves publishing state and ownership into the single status a screen
 * should render. The ordering of these branches is the policy:
 *
 * 1. owned and installed        → playable
 * 2. owned, not yet written     → coming soon, and said so warmly: it is theirs
 * 3. unwritten, unowned         → coming soon
 * 4. released, purchasable      → available
 * 5. released, no route to buy  → locked
 */
export function resolveCaseAvailability(
  caseId: string,
  context: AccessContext,
): CaseAvailability | null {
  const catalog = context.catalog ?? CASE_CATALOG;
  const entry =
    catalog.find((item) => item.id === caseId || item.definitionId === caseId) ??
    getCaseCatalogEntry(caseId);
  if (!entry) return null;

  const held = resolveHeldEntitlements(
    context.grants,
    context.bundled ?? BUNDLED_ENTITLEMENTS,
    ENTITLEMENT_INDEX,
  );

  const entitled = held.has(entry.entitlement);
  const installed =
    entry.definitionId !== null &&
    context.installedDefinitionIds.includes(entry.definitionId);
  const offers = productsGranting(entry.entitlement).filter(
    (product) => product.availability === 'available',
  );

  const base = { entry, entitled, installed, requiredEntitlement: entry.entitlement };

  if (entitled && installed) {
    return { ...base, status: 'playable', offers: [], note: 'Ready to open.' };
  }

  if (entitled) {
    return {
      ...base,
      status: 'coming-soon',
      offers: [],
      note: 'In your collection. Arrives in a future dossier.',
    };
  }

  if (entry.release === 'announced') {
    return {
      ...base,
      status: 'coming-soon',
      offers,
      note: entry.expectedLabel ?? 'In preparation.',
    };
  }

  if (offers.length > 0) {
    return {
      ...base,
      status: 'available',
      offers,
      note: 'Available in the anthology.',
    };
  }

  return {
    ...base,
    status: 'locked',
    offers: [],
    note: 'Not currently obtainable.',
  };
}

/**
 * The question itself. True only when the player holds the claim *and* the
 * content exists to open — ownership of an unwritten case is not access.
 */
export function canAccessCase(caseId: string, context: AccessContext): boolean {
  return resolveCaseAvailability(caseId, context)?.status === 'playable';
}

export function resolveLibrary(
  context: AccessContext,
): readonly CaseAvailability[] {
  const catalog = context.catalog ?? CASE_CATALOG;
  return catalog.flatMap((entry) => {
    const availability = resolveCaseAvailability(entry.id, context);
    return availability ? [availability] : [];
  });
}

export function isPlayable(availability: CaseAvailability): boolean {
  return availability.status === 'playable';
}

/** Small caps word printed on a contents row. Colour never carries this alone. */
export function availabilityLabel(status: CaseAvailabilityStatus): string {
  switch (status) {
    case 'playable':
      return 'AVAILABLE';
    case 'available':
      return 'IN THE ANTHOLOGY';
    case 'locked':
      return 'LOCKED';
    case 'coming-soon':
      return 'COMING SOON';
  }
}
