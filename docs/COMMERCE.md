# PROFILE + CONTENT STORE — INTERNET DETECTIVE

Phase 15. Architecture for a series, not a monetization layer.

> **The governing rule:** no screen is allowed to know what the player bought.
> A screen may ask one question — `canAccessCase(caseId)` — and everything
> behind that question is data. That indirection is the entire deliverable.
> Everything else in this phase is a consequence of it.

Case 001 is untouched. It is free, complete, permanent, and the only playable
case in this build.

---

## 1. The layers

```
 screens ──► useCanAccessCase / useCaseLibrary      ← the only question asked
                    │
                    ▼
            canAccessCase(caseId, context)          ← pure, table-driven
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
   entitlements              case catalog           ← what is held / published
        ▲
        │
  entitlement.store ◄── purchaseService ◄── BillingAdapter
                                              ├── mock (development)
                                              └── platform (not wired)
```

| File | Responsibility |
| --- | --- |
| `src/core/commerce/entitlements.ts` | Claim ids, the containment graph, grant merging, recovery of corrupt saves. |
| `src/core/commerce/catalog.ts` | What is published: six cases, entitlement definitions, products. No case content. |
| `src/core/commerce/caseAccess.ts` | `canAccessCase` and the four-state availability resolver. |
| `src/core/commerce/useCaseAccess.ts` | The React face. Screens use only this. |
| `src/core/commerce/purchase/*` | Contracts, the mock adapter, the unwired platform adapter, the service. |
| `src/state/entitlement.store.ts` | Persists grants; owns the purchase phase. |

---

## 2. Entitlements

An entitlement is a *claim on content* — not a purchase, not a screen, not a
case id. Ids are opaque and scoped:

```
case:001        season:01        complete:edition
```

Containment is **data, not code**:

```
complete:edition ──► season:01 ──► case:001 … case:006
```

Holding the complete edition resolves transitively to every case beneath it.
Adding Season Two is a catalog edit; no branch anywhere changes. The expansion
is cycle-safe and tolerant of unknown ids — a malformed catalog must never be
able to lock a player out of content they own.

**Case 001 is bundled, not granted.** It is listed in `BUNDLED_ENTITLEMENTS`
and unioned in on every resolution, so it cannot be lost by clearing storage,
by a failed restore, or by being offline. There is no record to lose.

**Merging never loses a claim, and never rewrites history.** A player who
bought a case on day one and the complete edition a year later has still owned
that case since day one; `mergeGrants` keeps the earliest date.

---

## 3. `canAccessCase`

```ts
canAccessCase(caseId, { grants, installedDefinitionIds }): boolean
```

True only when the claim is held **and** the content exists. Owning an
unwritten case is not access — a distinction that matters the moment someone
buys Season One before Case 004 has been authored.

The resolver's branch order *is* the policy:

| Situation | Status | What the player is told |
| --- | --- | --- |
| owned + installed | `playable` | AVAILABLE |
| owned, not yet written | `coming-soon` | "In your collection. Arrives in a future dossier." |
| unwritten, unowned | `coming-soon` | IN PREPARATION |
| released, purchasable | `available` | IN THE ANTHOLOGY |
| released, no route to buy | `locked` | LOCKED |

Every status has a **word**, never a colour alone — the Phase 14 rule holds
here too, and each contents row pairs its colour with an icon and the word.

The abstraction is enforced by test, not by review. `accessArchitecture.test.ts`
reads the source and fails the build if any file outside the store layer
imports the entitlement store, names a product id, or writes an entitlement id
as a literal. That last one is the exact mistake this phase exists to prevent:
a hardcoded `case:001` in a screen would survive the case joining a bundle and
then quietly lock out a player who owns it.

---

## 4. The case library

All six cases are published; one is installed.

```
CASE 001  THE MISSING DIAMOND     AVAILABLE
CASE 002  THE LAST MESSAGE        COMING SOON
CASE 003  11:47 PM                COMING SOON
CASE 004  THE EMPTY APARTMENT     COMING SOON
CASE 005  FALSE ALIBI             COMING SOON
CASE 006  DEAD DROP               COMING SOON
```

Each announced entry carries a title and **one line of jacket copy** — nothing
else. No fabricated evidence, no invented suspects, no solution, no
`CaseDefinition`. A test asserts that every `announced` entry has a null
`definitionId`, so an unwritten case can never claim to be installed.

A row that is not playable does not argue with the player: it defers to the
anthology.

---

## 5. The detective record (profile)

A **personnel file, typeset** — rules, numerals, small caps, a stamped rank, a
ledger. Not a dashboard.

```
──────────────────────────────
THE DETECTIVE
RECORD
INTERNET DETECTIVE · FIELD SERVICE      CONFIDENTIAL
──────────────────────────────

┌────────┐   Junior Detective
│ GRADE  │   248 SERVICE POINTS
│   03   │   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
└────────┘   72 points to the next grade.

I    CASES CLOSED                    01 FILED
II   ACTIVE INVESTIGATIONS           01 OPEN
III  COMMENDATIONS                   4 OF 10
IV   THE LEDGER
     EVIDENCE RECOVERED ·········· 48
     STRINGS RUN ················· 17
     TIME IN THE FIELD ··········· 4 h 12 m
```

What it shows: detective level and rank, cases closed with filing dates and
verdicts, active investigations (resumable), commendations awarded and pending,
and the ledger of figures.

What it refuses to show, deliberately: tiles, charts, progress rings,
percentages, streaks, daily goals, session counts, engagement rates. A test
asserts no ledger label matches `/streak|daily|session|engagement|rate|%/`.
Progress is stated in words — "34 artifacts recovered · 2 deductions proven" —
because that is how a detective would say it.

Every figure is derived from persisted progress. Nothing is estimated, and
nothing is fetched.

---

## 6. The anthology (store)

A **published series**, not a shop: a masthead, a contents page, a shelf of
bound volumes, and a colophon.

It has no cart, no grid of tiles, no pricing table, no feature-comparison
matrix, no "BEST VALUE" flag, no struck-through price, no discount, no
countdown, no consumable, and no second attempt to sell after the first is
declined. **A cancelled purchase says nothing at all** — silence is the correct
response to someone changing their mind.

The house rules are printed where a colophon would be:

> Case 001 is free, complete, and permanent.
> Every case is bought once and owned for good.
> No advertising, no energy, no lives, no loot boxes, no timers.
> Nothing you own can expire, and nothing renews.

Collected editions — Season One and the Complete Edition — are presented as
bound volumes with a spine rule and a quiet price in the margin.

---

## 7. Purchase architecture

Interfaces for products, entitlements, purchase, restore, and purchase state
exist; **real billing does not**, and the build says so out loud.

```ts
interface BillingAdapter {
  isAvailable(): Promise<boolean>;
  listProducts(ids): Promise<StoreProduct[]>;
  purchase(id): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
}
```

| Adapter | When | Behaviour |
| --- | --- | --- |
| `createMockBillingAdapter` | `__DEV__` | Latency, cancellation, failure, already-owned, and restore — all injectable, all deterministic. Sells nothing, charges nothing. |
| `createPlatformBillingAdapter` | release | Reports itself unavailable. The anthology prints "ACQUISITION IS NOT OPEN ON THIS BUILD" rather than staging a fake transaction. |

There is no third branch that silently sells something.

`PurchaseOutcome` treats **cancellation as an ordinary outcome**, not an error.
`already-owned` never double-charges. The service turns an outcome into claims;
the store persists them; `canAccessCase` sees them on the next render.

### What real billing will need

Written in `platformBillingAdapter.ts` so it is next to the code that will
change:

1. A billing library with native code (`expo-iap` or `react-native-iap`),
   installed via `npx expo install` — which requires a development build, since
   Expo Go cannot transact.
2. Products registered in App Store Connect and Play Console under the
   identifiers already declared in `catalog.ts`, as **non-consumable** items.
   Nothing in this game is consumable.
3. A StoreKit configuration file for the simulator; a licence tester on Android.
4. Server-side receipt validation before a grant is trusted on a new device.

Only the body of that one file changes. `canAccessCase`, the entitlement model,
and every screen stay exactly as they are — which is the reason the seam exists.

**No credentials, keys, or secrets are in this repository.** Product
identifiers are identifiers; a test greps the catalog for secret-shaped strings
and fails if one appears.

---

## 8. Persistence

`internet-detective.entitlements` (v1) stores **grants only**. Phase, shelf,
and status messages are session state and are deliberately never written — a
half-finished purchase must not be able to resurrect itself on next launch.
Corrupt entries are dropped on load rather than crashing; valid siblings
survive. The app waits for this store to hydrate before rendering, so a case is
never briefly shown as unavailable to someone who owns it.

---

## 9. The gate

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npx vitest run` | **173 / 173 across 16 files** |
| `npx expo-doctor` | 21 / 21 |
| iOS + Android export | succeeds |

New suites: `entitlements` (20), `caseAccess` (14), `purchase` (14),
`accessArchitecture` (7), `profileStatistics` (10).

Case 001's content, solution, and engine data were not modified in this phase.
