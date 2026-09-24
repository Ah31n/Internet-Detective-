/**
 * ENTITLEMENTS
 *
 * An entitlement is a *claim on content*, not a purchase and not a screen.
 * Screens never ask "did the player buy product X" — they ask whether a claim
 * is held. That indirection is the whole point: a case can be granted by a
 * single purchase, by a season, by a complete edition, by a promotional code,
 * or simply by being bundled with the app, and nothing downstream has to know
 * which.
 *
 * Ids are opaque, scoped strings:
 *
 *     case:001        a single case
 *     season:01       every case in a season
 *     complete:edition   everything, present and future
 *
 * Nothing in this file imports React, React Native, or any case content. It is
 * pure data logic so it can be reasoned about and tested exhaustively.
 */

export type EntitlementScope = 'case' | 'season' | 'complete';

/** e.g. `case:001`, `season:01`, `complete:edition`. */
export type EntitlementId = `${EntitlementScope}:${string}`;

export interface ParsedEntitlementId {
  scope: EntitlementScope;
  key: string;
}

const SCOPES: readonly EntitlementScope[] = ['case', 'season', 'complete'];

/** Parses an id, returning null rather than throwing on malformed input. */
export function parseEntitlementId(value: string): ParsedEntitlementId | null {
  const separator = value.indexOf(':');
  if (separator <= 0) return null;

  const scope = value.slice(0, separator);
  const key = value.slice(separator + 1);
  if (key.length === 0) return null;
  if (!SCOPES.includes(scope as EntitlementScope)) return null;

  return { scope: scope as EntitlementScope, key };
}

export function isEntitlementId(value: string): value is EntitlementId {
  return parseEntitlementId(value) !== null;
}

/**
 * How a claim came to be held. Kept on the record because "restore" and
 * "developer" must never be indistinguishable from a real purchase when we
 * come to audit a support ticket.
 */
export type EntitlementSource =
  | 'bundled'
  | 'purchase'
  | 'restore'
  | 'promotional'
  | 'developer';

export interface EntitlementGrant {
  id: EntitlementId;
  source: EntitlementSource;
  grantedAtEpochMs: number;
  /** The product that produced this grant, when there was one. */
  productId: string | null;
}

/**
 * Containment between claims, declared as data.
 *
 * `season:01` includes the cases in it; `complete:edition` includes the
 * seasons. Because this is a graph rather than a hardcoded `if`, adding
 * Season Two is a catalog edit and not a code change.
 */
export interface EntitlementDefinition {
  id: EntitlementId;
  title: string;
  /** One editorial line. Shown wherever a claim is named to the player. */
  description: string;
  includes: readonly EntitlementId[];
}

export type EntitlementIndex = ReadonlyMap<EntitlementId, EntitlementDefinition>;

export function indexEntitlements(
  definitions: readonly EntitlementDefinition[],
): EntitlementIndex {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

/**
 * Expands held claims through the containment graph.
 *
 * Holding `complete:edition` resolves to every season and every case beneath
 * it. Cycles and unknown ids are tolerated: a malformed catalog must never be
 * able to hang the app or lock a player out of content they own.
 */
export function expandEntitlements(
  held: readonly EntitlementId[],
  index: EntitlementIndex,
): ReadonlySet<EntitlementId> {
  const resolved = new Set<EntitlementId>();
  const queue = [...held];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (resolved.has(current)) continue;
    resolved.add(current);

    const definition = index.get(current);
    if (!definition) continue;
    for (const child of definition.includes) {
      if (!resolved.has(child)) queue.push(child);
    }
  }

  return resolved;
}

/** The set of claims a player effectively holds, bundled content included. */
export function resolveHeldEntitlements(
  grants: readonly EntitlementGrant[],
  bundled: readonly EntitlementId[],
  index: EntitlementIndex,
): ReadonlySet<EntitlementId> {
  return expandEntitlements(
    [...bundled, ...grants.map((grant) => grant.id)],
    index,
  );
}

export function hasEntitlement(
  entitlement: EntitlementId,
  held: ReadonlySet<EntitlementId>,
): boolean {
  return held.has(entitlement);
}

/**
 * Merges new grants into existing ones without ever losing a claim.
 *
 * Re-granting something already held keeps the *earliest* record: a player who
 * bought a case on day one and later buys the complete edition has still owned
 * that case since day one, and a restore must not rewrite that history.
 */
export function mergeGrants(
  existing: readonly EntitlementGrant[],
  incoming: readonly EntitlementGrant[],
): readonly EntitlementGrant[] {
  const merged = new Map<EntitlementId, EntitlementGrant>();

  for (const grant of [...existing, ...incoming]) {
    const previous = merged.get(grant.id);
    if (!previous) {
      merged.set(grant.id, grant);
      continue;
    }
    merged.set(grant.id, {
      ...previous,
      grantedAtEpochMs: Math.min(
        previous.grantedAtEpochMs,
        grant.grantedAtEpochMs,
      ),
    });
  }

  return [...merged.values()].sort(
    (left, right) => left.grantedAtEpochMs - right.grantedAtEpochMs,
  );
}

/** Narrows unknown persisted data back into grants. Used by the store's merge. */
export function sanitizeGrants(value: unknown): readonly EntitlementGrant[] {
  if (!Array.isArray(value)) return [];

  const sources: readonly string[] = [
    'bundled',
    'purchase',
    'restore',
    'promotional',
    'developer',
  ];

  return value.flatMap((entry): EntitlementGrant[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== 'string' || !isEntitlementId(record.id)) return [];

    const source = sources.includes(record.source as string)
      ? (record.source as EntitlementSource)
      : 'purchase';
    const grantedAtEpochMs =
      typeof record.grantedAtEpochMs === 'number' &&
      Number.isFinite(record.grantedAtEpochMs)
        ? record.grantedAtEpochMs
        : 0;

    return [
      {
        id: record.id,
        source,
        grantedAtEpochMs,
        productId:
          typeof record.productId === 'string' ? record.productId : null,
      },
    ];
  });
}
