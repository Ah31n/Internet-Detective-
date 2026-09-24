# DEVELOPMENT QA TOOLS — INTERNET DETECTIVE

Phase 17. A developer-only QA system that is **not in the production binary at
all** — not hidden in it, not disabled in it, not present in it.

---

## 1. The finding that shaped this phase

The brief says: *do not rely solely on hiding a button.* Taking that seriously
meant checking what a release build actually contains rather than trusting the
guards, so a production bundle was exported and grepped.

Two things were wrong.

**The canonical solution to Case 001 was shipping in the binary.** Motive,
method, concealment, the twelve-step deterministic sequence — all of it,
readable with `strings`. The cause: `case001.definition.ts` imported the
engine's answer key, `CASE001_CANONICAL_TRUTH`, and that constant lived in the
same module as the narrative record. One import, and the whole spoiler-sealed
file was in the graph. The seal was a naming convention, not a build property.

**`if (__DEV__) require('./devTools')` does not keep anything out of a
bundle.** Metro collects dependencies from the syntax tree *before* any
minifier deletes the dead branch, so the module is resolved, transformed, and
written into the output regardless. With only the runtime guard in place, the
first verification run found every QA tool label and every sealed phrase in the
production bundle:

```
FAILED — 16 forbidden string(s) in the release bundle:
  SEALED SOLUTION  "sealed the real Asterion inside the battery cavity"
  DEVELOPER TOOL   "REVEAL CANONICAL SOLUTION"
  …
```

Both are fixed, and the check that caught them is now a command.

---

## 2. Three independent layers

Exposure is prevented three times over, and each layer is proved separately.

### Layer 1 — the flag (`src/core/dev/devMode.ts`)

```ts
const BUILD_IS_DEVELOPMENT = typeof __DEV__ !== 'undefined' && __DEV__ === true;
const SILENCED_BY_ENVIRONMENT = process.env.EXPO_PUBLIC_DEV_TOOLS === 'off';

export const DEV_TOOLS_ENABLED = BUILD_IS_DEVELOPMENT && !SILENCED_BY_ENVIRONMENT;
```

The environment variable **subtracts only**. There is deliberately no value of
any variable that can switch the tools on, because a flag that can enable
developer tooling is a flag that can be set by accident on a shipped build.
`EXPO_PUBLIC_DEV_TOOLS=off` exists for recording footage or handing a debug
build to a playtester.

Every tool also re-checks the gate itself, so a misrouted call is inert rather
than dangerous.

### Layer 2 — the bundler (`metro.config.js`)

This is the layer that actually does the work. When `context.dev` is false —
which Metro derives from the build mode, not from an environment variable an
operator could get wrong — every request for a developer-only module resolves
to an empty stub:

| Redirected in release builds | Why |
| --- | --- |
| `src/core/dev/qaTools` | the tool registry |
| `src/core/dev/qaInspectors` | the state inspectors |
| `src/core/dev/canonicalReveal` | the solution loader |
| `src/features/qa/**` | the console screen |
| `src/case-content/…/case001.solution` | the sealed narrative record |

The real files are never read, so their contents cannot reach the binary.
`devMode.ts` is deliberately *not* redirected: shipped code imports it to learn
that the gate is shut, and it has to keep answering.

### Layer 3 — the content split

`case001.solution.ts` was split in two:

- **`case001.truth.ts`** — `CASE001_CANONICAL_TRUTH`, the table of identifiers
  the engine scores against. It must ship, and it does.
- **`case001.solution.ts`** — the written solution. **Nothing in the
  application imports it.** It is read by the authoring tests, and by the QA
  console through a redirected `require`.

---

## 3. The hidden entry point

There is no button, and nothing in Settings names the QA console.

What Settings shows is a build stamp — `INTERNET DETECTIVE 0.1.0 · BUILD 1` —
the line a tester quotes in a bug report. **Seven taps within three seconds**
opens the console, with a quiet `n MORE` counter appearing only for the last
three taps, so the gesture cannot be stumbled into and cannot be found by
reading the interface.

In a release build the component returns before any handler or pressable is
created: the stamp is a plain label with no tap target at all, not a silent
one. And there is nothing behind it to reach — the console is not in the
binary. A deep link to `/qa` redirects to the desk.

The old `DeveloperToolsPanel`, which sat in plain view in Settings, has been
deleted.

---

## 4. The tools

Grouped by what they touch, each with a description, a confirmation step on
anything destructive, and a timestamped result log.

| Group | Tool | Effect |
| --- | --- | --- |
| **Case state** | RESET CASE 001 | Clears the session back to briefing. |
| | COMPLETE CASE 001 | Resolves at full score with the canonical deductions solved. |
| | JUMP TO CASE REPORT | Resolves if needed, then opens the closing sequence. |
| **Evidence** | ADD ALL EVIDENCE | Inventory only — scenes unvisited, nothing marked read. |
| | UNLOCK ALL EVIDENCE | Full access — every scene entered, every artifact found and read. |
| **Board** | RESET EVIDENCE BOARD | Empties placements, strings, groups, theories, viewport. |
| | CREATE TEST CONNECTIONS | Pins eight strings across discovered artifacts. |
| | SIMULATE CONTRADICTION | Marks a contradiction, to exercise the red-string path. |
| **Save / entitlements** | SIMULATE PREMIUM ENTITLEMENT | Grants `complete:edition` as a developer grant. No purchase. |
| | REVOKE ALL ENTITLEMENTS | Drops every grant. Case 001 stays playable — it is bundled. |
| | CLEAR LOCAL SAVE | Wipes sessions, profile, entitlements, shell; flushes to disk. |
| **Truth** | REVEAL CANONICAL SOLUTION | Prints the sealed record behind an explicit reveal. |

`ADD ALL EVIDENCE` and `UNLOCK ALL EVIDENCE` are kept separate on purpose: one
is for testing the evidence index and a fully loaded board, the other is for
skipping to the endgame.

**Every tool runs through the real engine or the real store.** The connection
and contradiction tools dispatch `CONNECT_EVIDENCE` exactly as the board does.
A shortcut that hand-writes a player state is worse than no shortcut — it sends
testers hunting bugs that only the shortcut can cause.

---

## 5. The inspectors

The INSPECT tab is read-only and covers everything the brief lists:

| Inspector | Shows |
| --- | --- |
| Evidence IDs | Every id, type, title, and whether it is `HELD`, `HELD · READ`, or `NOT FOUND`. |
| Evidence dependencies | The authored stage graph: purpose, required artifacts, what each unlocks, and how many of the requirements are currently held. |
| Case state | Phase, turn, current scene, scenes visited, deductions solved, hints, resolution — and a loud `MISMATCH` if the save's content version has drifted from the definition. |
| Player state | Discovered / read / referenced counts, notes, strings, placements, viewport, pages visited. |
| Timeline state | Every event as `PINNED`, `KNOWN`, or `HIDDEN`, by whether a sourcing artifact is held. |
| Theory state | Theory clusters and groups with their members and creation turn. |
| Entitlement state | Active billing adapter, availability, the resolved claim set, and every grant with its source and date. |

The console is styled as an instrument — monospace, dense, a red rule across
the top, `NOT PRESENT IN RELEASE BUILDS` under the title. Nobody should be able
to mistake a screenshot of it for the game.

---

## 6. Verification

```bash
npm run verify:release
```

Exports a real production bundle for both platforms and greps the compiled
Hermes output for six phrases that exist only in the sealed solution and twelve
strings that exist only in the QA surface. Any hit fails the command.

```
Scanning 1 compiled file(s), 4.1 MB.
PASS — 6 sealed phrases and 12 developer strings are absent from the release bundle.
Scanning 1 compiled file(s), 4.3 MB.
PASS — 6 sealed phrases and 12 developer strings are absent from the release bundle.
```

The development bundle was checked too, and still contains all of it — the
tools are genuinely available where they are supposed to be.

Alongside that, 27 unit tests in `src/core/dev/__tests__` cover the gate
algebra (including that no environment value opens it in a release build), the
absence of any static import into the QA surface from shipped code, the
truth/solution split, the inert release form of the build stamp, that every
tool carries its own guard, and the behaviour of each tool and inspector.

---

## 7. The gate

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npx vitest run` | **235 / 235 across 21 files** |
| `npx expo-doctor` | 21 / 21 |
| `npm run verify:release` | PASS on iOS and Android |

Case 001's content and canonical truth are unchanged — the solution record was
moved between files, not edited.
