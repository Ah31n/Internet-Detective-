import type { EntitlementDefinition, EntitlementId } from './entitlements';
import { indexEntitlements } from './entitlements';

/**
 * THE ANTHOLOGY CATALOG
 *
 * The published shape of the series: which cases exist, which claim unlocks
 * each one, and which bound volumes collect them. This file is deliberately
 * free of case *content* — no evidence, no suspects, no solutions. A case can
 * be listed here long before a single artifact of it has been authored, which
 * is exactly what lets the library advertise the season without fabricating
 * an investigation that does not exist yet.
 *
 * The engine's `CaseDefinition` registry remains the source of truth for what
 * is actually playable. This catalog only ever says what is *published*.
 */

export type CaseCatalogId =
  | 'case-001'
  | 'case-002'
  | 'case-003'
  | 'case-004'
  | 'case-005'
  | 'case-006';

/**
 * Where a case is in its publishing life.
 *
 * - `released`   — content exists and ships in this build.
 * - `announced`  — titled and dated on the contents page, nothing more.
 */
export type CaseReleaseState = 'released' | 'announced';

export interface CaseCatalogEntry {
  id: CaseCatalogId;
  /** Printed case number, e.g. `001`. */
  number: string;
  title: string;
  /** One line of jacket copy. Never a synopsis of an unwritten case. */
  logline: string;
  /** The claim that opens this case. */
  entitlement: EntitlementId;
  seasonId: string;
  release: CaseReleaseState;
  /**
   * Links a published entry to an installed `CaseDefinition`. Null until the
   * case has actually been authored.
   */
  definitionId: string | null;
  /** Printed on the contents page beside announced entries. */
  expectedLabel: string | null;
}

export const CASE_CATALOG: readonly CaseCatalogEntry[] = [
  {
    id: 'case-001',
    number: '001',
    title: 'THE MISSING DIAMOND',
    logline:
      'A forty-two carat stone is replaced by a replica inside a sealed case, in a room full of witnesses.',
    entitlement: 'case:001',
    seasonId: 'season:01',
    release: 'released',
    definitionId: 'case-001-missing-diamond',
    expectedLabel: null,
  },
  {
    id: 'case-002',
    number: '002',
    title: 'THE LAST MESSAGE',
    logline: 'Seven words, sent at the wrong time, from a phone nobody could reach.',
    entitlement: 'case:002',
    seasonId: 'season:01',
    release: 'announced',
    definitionId: null,
    expectedLabel: 'IN PREPARATION',
  },
  {
    id: 'case-003',
    number: '003',
    title: '11:47 PM',
    logline: 'Every account of the evening agrees, except about one minute of it.',
    entitlement: 'case:003',
    seasonId: 'season:01',
    release: 'announced',
    definitionId: null,
    expectedLabel: 'IN PREPARATION',
  },
  {
    id: 'case-004',
    number: '004',
    title: 'THE EMPTY APARTMENT',
    logline: 'The tenant has been gone eleven days. The utilities say otherwise.',
    entitlement: 'case:004',
    seasonId: 'season:01',
    release: 'announced',
    definitionId: null,
    expectedLabel: 'IN PREPARATION',
  },
  {
    id: 'case-005',
    number: '005',
    title: 'FALSE ALIBI',
    logline: 'The alibi is verified, corroborated, timestamped — and impossible.',
    entitlement: 'case:005',
    seasonId: 'season:01',
    release: 'announced',
    definitionId: null,
    expectedLabel: 'IN PREPARATION',
  },
  {
    id: 'case-006',
    number: '006',
    title: 'DEAD DROP',
    logline: 'Something was exchanged in the open, on camera, and nobody saw it.',
    entitlement: 'case:006',
    seasonId: 'season:01',
    release: 'announced',
    definitionId: null,
    expectedLabel: 'IN PREPARATION',
  },
];

/**
 * Claims that every player holds, purchased or not.
 *
 * Case 001 is free and permanently playable. It is bundled rather than
 * granted, so it cannot be lost by clearing storage, failing a restore, or
 * going offline — there is no record to lose.
 */
export const BUNDLED_ENTITLEMENTS: readonly EntitlementId[] = ['case:001'];

export const ENTITLEMENT_DEFINITIONS: readonly EntitlementDefinition[] = [
  {
    id: 'case:001',
    title: 'Case 001',
    description: 'The Missing Diamond. Included with the app.',
    includes: [],
  },
  {
    id: 'case:002',
    title: 'Case 002',
    description: 'The Last Message.',
    includes: [],
  },
  {
    id: 'case:003',
    title: 'Case 003',
    description: '11:47 PM.',
    includes: [],
  },
  {
    id: 'case:004',
    title: 'Case 004',
    description: 'The Empty Apartment.',
    includes: [],
  },
  {
    id: 'case:005',
    title: 'Case 005',
    description: 'False Alibi.',
    includes: [],
  },
  {
    id: 'case:006',
    title: 'Case 006',
    description: 'Dead Drop.',
    includes: [],
  },
  {
    id: 'season:01',
    title: 'Season One',
    description: 'All six cases of the first season, bound together.',
    includes: [
      'case:001',
      'case:002',
      'case:003',
      'case:004',
      'case:005',
      'case:006',
    ],
  },
  {
    id: 'complete:edition',
    title: 'The Complete Edition',
    description: 'Every season published, and every season still to come.',
    includes: ['season:01'],
  },
];

export const ENTITLEMENT_INDEX = indexEntitlements(ENTITLEMENT_DEFINITIONS);

/**
 * PRODUCTS
 *
 * A product is the thing a player acquires; an entitlement is what they end up
 * holding. Keeping them separate means a bundle, a gift, or a regional edition
 * is a new product row rather than a new branch in the access logic.
 *
 * Store identifiers are *identifiers only*. No keys, no secrets, no
 * credentials live in this repository.
 */
export type ProductId =
  | 'product.case.002'
  | 'product.case.003'
  | 'product.case.004'
  | 'product.case.005'
  | 'product.case.006'
  | 'product.season.01'
  | 'product.complete.edition';

export type ProductKind = 'case' | 'season' | 'edition';

export interface ProductDefinition {
  id: ProductId;
  kind: ProductKind;
  title: string;
  /** Small caps line printed under the title on the shelf. */
  shelfLine: string;
  description: string;
  grants: readonly EntitlementId[];
  /**
   * Fallback price copy, used only until the platform returns localized
   * pricing. Never treated as authoritative.
   */
  fallbackPrice: string;
  /** `announced` products are listed but cannot be acquired yet. */
  availability: 'available' | 'announced';
  /** Product identifiers as they will be registered with each platform. */
  storeIds: { ios: string; android: string };
}

export const PRODUCT_CATALOG: readonly ProductDefinition[] = [
  {
    id: 'product.case.002',
    kind: 'case',
    title: 'THE LAST MESSAGE',
    shelfLine: 'CASE 002 · SINGLE CASE',
    description: 'One complete investigation, owned permanently.',
    grants: ['case:002'],
    fallbackPrice: '$3.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.case002',
      android: 'case_002_last_message',
    },
  },
  {
    id: 'product.case.003',
    kind: 'case',
    title: '11:47 PM',
    shelfLine: 'CASE 003 · SINGLE CASE',
    description: 'One complete investigation, owned permanently.',
    grants: ['case:003'],
    fallbackPrice: '$3.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.case003',
      android: 'case_003_1147pm',
    },
  },
  {
    id: 'product.case.004',
    kind: 'case',
    title: 'THE EMPTY APARTMENT',
    shelfLine: 'CASE 004 · SINGLE CASE',
    description: 'One complete investigation, owned permanently.',
    grants: ['case:004'],
    fallbackPrice: '$3.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.case004',
      android: 'case_004_empty_apartment',
    },
  },
  {
    id: 'product.case.005',
    kind: 'case',
    title: 'FALSE ALIBI',
    shelfLine: 'CASE 005 · SINGLE CASE',
    description: 'One complete investigation, owned permanently.',
    grants: ['case:005'],
    fallbackPrice: '$3.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.case005',
      android: 'case_005_false_alibi',
    },
  },
  {
    id: 'product.case.006',
    kind: 'case',
    title: 'DEAD DROP',
    shelfLine: 'CASE 006 · SINGLE CASE',
    description: 'One complete investigation, owned permanently.',
    grants: ['case:006'],
    fallbackPrice: '$3.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.case006',
      android: 'case_006_dead_drop',
    },
  },
  {
    id: 'product.season.01',
    kind: 'season',
    title: 'SEASON ONE',
    shelfLine: 'SIX CASES · BOUND VOLUME',
    description:
      'The first six investigations, delivered as each one is published. Bought once.',
    grants: ['season:01'],
    fallbackPrice: '$14.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.season01',
      android: 'season_01',
    },
  },
  {
    id: 'product.complete.edition',
    kind: 'edition',
    title: 'THE COMPLETE EDITION',
    shelfLine: 'EVERY CASE · PRESENT AND FUTURE',
    description:
      'Every season published, and every season still to come. One payment, no renewal.',
    grants: ['complete:edition'],
    fallbackPrice: '$24.99',
    availability: 'announced',
    storeIds: {
      ios: 'com.internetdetective.complete',
      android: 'complete_edition',
    },
  },
];

export function getCaseCatalogEntry(
  caseId: string,
): CaseCatalogEntry | undefined {
  return CASE_CATALOG.find(
    (entry) => entry.id === caseId || entry.definitionId === caseId,
  );
}

export function getProduct(productId: string): ProductDefinition | undefined {
  return PRODUCT_CATALOG.find((product) => product.id === productId);
}

/** Every product that would grant the given claim, cheapest route first. */
export function productsGranting(
  entitlement: EntitlementId,
  index = ENTITLEMENT_INDEX,
): readonly ProductDefinition[] {
  return PRODUCT_CATALOG.filter((product) =>
    product.grants.some((granted) => {
      if (granted === entitlement) return true;
      const definition = index.get(granted);
      if (!definition) return false;
      // One level of nesting is enough for the shelf: a season lists its
      // cases, the complete edition lists its seasons.
      return (
        definition.includes.includes(entitlement) ||
        definition.includes.some((child) =>
          index.get(child)?.includes.includes(entitlement),
        )
      );
    }),
  );
}
