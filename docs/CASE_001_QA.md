# CASE 001 — LOGIC VALIDATION REPORT (PHASE 9.5)

> **INTERNAL DOCUMENT — CONTAINS SOLUTION MATERIAL.**
> This report is for authoring and QA only. Nothing described here is passed to
> the investigation view model or rendered before a correct resolution.

## Scope

A dedicated audit and repair pass over the existing CASE 001 content. No
application redesign, no UI rebuild, no architecture replacement, and no second
version of the case. All repairs were made in case data plus its test suites.

## 1. Canonical solution trace

| Question | Answer |
| --- | --- |
| WHO | Adrian Cross, head of security, executing; Elias Ward brokering and financing |
| WHAT | The authentic Asterion exchanged for a commissioned optical replica |
| WHEN | 21:17:43 – 21:21:04 on 14 OCT, inside a scheduled ninety-second generator transfer |
| WHERE | Gallery Four rear service cavity, reached through the East Service Corridor |
| WHY | A private 96,000 marker called on 06 OCT, settled in two payments of 48,000 |
| HOW | Cloned credential DT-884, a ninety-second camera replay, and an 8.4 mm triangular bypass key on the plinth service hatch |
| CACHE | Battery cavity of retired emergency radio R-17 in Loading Locker B |

Supporting chains: frame-hash replay, credential administration audit, replica
commission, corridor camera and two physical traces, broker channel and payment,
locker/radio custody, and the lender demand.

Red herrings retained: the insurance rider, Bell's climate dispute and press
leak, Rook's called note, Okafor's unauthorized recording, and the Northline van
outside the sealed dock.

## 2. Defects found and repaired

### 2.1 The motive was asserted rather than proven

`answer-private-debt` had no artifact establishing the executor's debt, while two
incorrect motive options each had supporting documents. **Repair:**
`evidence-doc-cross-debt` (private lender final demand, account AC-7731, 96,000
called on 06 OCT, two settlements of 48,000, undeclared to museum vetting) and a
new required deduction `deduction-executor-motive`, whose canonical set also
includes the insurance rider and the trust article so the two rival motives are
eliminated by evidence rather than by omission.

### 2.2 An alternative executor was not excluded

The broker had an unmonitored 21:14 – 21:23 interval in the lounge telephone
niche, which fully covered the substitution window. He could therefore satisfy
WHO + WHAT + WHEN + WHERE + WHY + HOW. **Repair:**
`evidence-doc-lounge-call-record` — extension 214 carried one continuous corded
call from 21:14:06 to 21:22:58, the recess has a single doorway under the lounge
camera, and no departure is recorded. The suspicion survives (he is calling the
illicit buyer); the alternative theory does not.

### 2.3 Premature solution leak

The encrypted Cross–Ward channel was revealed in the third unlocked scene and
named the executor, the timing, and the cache in one artifact. **Repair:** the
channel and the lender demand now live in a new `scene-forensics-bench`, gated on
`deduction-service-route`, so a device seizure follows a proven physical route.
The cache line was reworded from `asleep in B` to `asleep with the dead sets`, so
the hiding place still requires the radio inventory, locker chit, and key photo.

### 2.4 Scene text contradicted the method

The published program stated Gallery Four stayed visible from the east arcade,
which would have put the substitution in view of guests. **Repair:** the gallery
is now closed behind the arcade screen until the 21:30 private viewing.

### 2.5 Misleading timeline attribution

Two timeline events attributed presence to Mara Bell where no record placed her
there: the 20:52 credential clone and the 21:17:43 panel entry. **Repair:** the
clone event lists only the administrator session holder, and the panel event
lists no suspect and states that duplicate token DT-884 was used while her
physical card remained in the office safe.

## 3. Timeline consistency

Automated checks now enforce:

- unique ids and strictly increasing sort orders;
- parsable `HH:MM` / `HH:MM:SS` labels in non-decreasing chronological order;
- every event sourced from at least one existing evidence item;
- each CCTV `durationSeconds` equal to its stated recording window;
- markers strictly ascending and inside the recording window;
- all four cameras covering the 21:17:43 – 21:21:04 substitution window.

No impossible overlaps or impossible movement remain. Cross leaves the annex at
21:12:11, reaches the panel at 21:17:43, is in the corridor at 21:18:02, and
returns at 21:21:08, before the gallery hash series goes live at 21:21:04 –
21:21:20.

## 4. Suspect exclusivity

| Suspect | Status | Excluded by |
| --- | --- | --- |
| Celeste Vane | Cleared | Signed broadcast frames at 21:14:36, 21:17:08, 21:20:41; rider names the Rook Trust as loss payee |
| Mara Bell | Framed, cleared | Biometric 21:08:09 – 21:24:31, RM-2 autosaves, live source call, duplicate token versus sealed card MC-04-P |
| Julian Rook | Cleared | Terrace camera 21:13:00 – 21:24:21, creditor thread, unsaleable trust asset |
| Nia Okafor | Cleared | Signed press-alcove take 21:16:02 – 21:22:18 with continuous Rotunda audio; no credential, uniform, or key |
| Elias Ward | Accomplice only | Continuous corded niche call 21:14:06 – 21:22:58, single monitored doorway |
| Adrian Cross | Executor | Admin session, cloned token, bypass key, corridor footage, uniform fiber, locker custody, lender demand |

The exclusions are stored in the sealed solution record and asserted by tests to
cover every non-executor suspect with a timestamped, record-backed reason.

## 5. Player-facing validation

The pre-resolution and post-deduction view models carry no canonical truth, no
dependency graph, no correctness flags, no scoring formula, and no sealed
authoring strings. This is asserted by serializing the view model and checking
for sealed material.

## 6. Final QA checklist

- [x] One canonical solution
- [x] Evidence supports every required deduction, including motive
- [x] Timeline is internally consistent
- [x] Six suspects are coherent and individually plausible
- [x] Red herrings are intentional and non-essential
- [x] No accidental solution leak
- [x] No impossible timestamps
- [x] No impossible movement
- [x] No unsupported deduction
- [x] Alternative theories are resolved by evidence, not concealment
- [x] Existing UI remains intact
- [x] Existing architecture remains intact
- [x] Case remains playable entirely offline

## 7. Verification

`npm run typecheck`, `npm run lint`, `npm test` (41 tests across 3 files),
`npm run doctor`, and iOS/Android exports.
