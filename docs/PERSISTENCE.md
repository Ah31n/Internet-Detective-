# PERSISTENT INVESTIGATION STATE

Everything the detective does is kept on the device. There is no backend, no
account, and no network dependency: CASE 001 is fully playable offline, and a
relaunch drops the player back exactly where the investigation stopped.

## Stores

| Store | Key | Version | Holds |
| --- | --- | --- | --- |
| `src/state/app.store.ts` | `internet-detective.app-shell` | 1 | last route, last investigation route, settings |
| `src/state/case-session.store.ts` | `internet-detective.case-sessions` | 5 | active case, per-case `CasePlayerState`, per-case `CaseProgressMeta` |
| `src/state/player-profile.store.ts` | `internet-detective.player-profile` | 1 | current case, completed cases, achievements, experience |

`src/state/playerState.ts` aggregates all three into one `PlayerState` read
model (`usePlayerState()`), exposes `useSaveHealth()`, and runs
`startProgressionBridge()`, which recomputes achievements, experience, and
detective level from case snapshots whenever a session changes.

## What persists per case

`CasePlayerState` (engine-owned, deterministic):

- discovered, viewed, and referenced evidence
- evidence notes (`evidenceNotes`, trimmed, `EVIDENCE_NOTE_MAX_LENGTH` capped)
- board placements, rotations, viewport, groups, connections, contradiction
  links, and theory clusters
- pinned timeline events, theories, solved deductions, attempts
- hints used (`hintsUsed`) and the resulting score penalty
- fictional internet history, visits, and bookmarks
- accusation attempts and the sealed resolution

`CaseProgressMeta` (session-owned, UI continuity):

- `completed`, `startedAtEpochMs`, `lastPlayedAtEpochMs`
- `investigationDurationMs` — accumulated real play time
- `lastScreen` — the last investigation route for this case
- `openEvidenceId` — evidence that was open when the app was interrupted

Canonical truth stays in `case001.solution.ts` and is never written into player
state.

## Autosave transport

`src/state/persistence/autosaveStorage.ts` wraps AsyncStorage:

- writes are **debounced** (default 450 ms) and coalesced per key, so a board
  drag that fires dozens of updates produces one device write
- `flush()` forces every pending write immediately
- each successful write keeps a rolling `<key>.backup` of the previous good
  payload
- unreadable payloads are moved to `<key>.corrupt` and reported through
  `subscribeToSaveHealth()` / `getSaveHealth()`

Meaningful actions that trigger an autosave: evidence collected or opened, note
created or edited, evidence moved, connected, or grouped, timeline modified,
theory modified, hint used, deduction or conclusion submitted, and any settings
change.

## Lifecycle

`src/core/bootstrap/useAutosaveLifecycle.ts`:

- starts the progression bridge
- runs a 30 s heartbeat that commits elapsed play time and flushes
- listens to `AppState`: on `inactive`/`background` it commits elapsed time and
  flushes synchronously (covering backgrounding and OS termination), and on
  `active` it restarts the play timer
- commits and flushes on unmount

`useAppBootstrap` blocks the first frame until all three stores report
`hasHydrated`, so no screen ever renders pre-restore state. Interrupted
animations and board interaction are safe because animated values are derived
from persisted logical positions, and rotation changes only re-layout from the
same restored state.

## Recovery

Recovery is graceful and never destructive:

1. unparsable payload → quarantined to `<key>.corrupt`, restored from
   `<key>.backup` when one exists
2. malformed individual case entries → dropped and listed in
   `recoveredCaseIds`; every readable case is kept
3. malformed fields → sanitised to safe defaults by
   `src/state/persistence/caseSessionMigrations.ts`
4. older saves → migrated forward (v1 → v5)

Settings surfaces the outcome: a SAVE RECOVERY notice with a
**RESTORE LAST GOOD SAVE** action when a key reports damage, otherwise the
LOCAL CONTINUITY note.

## Developer tools

`src/features/settings/components/DeveloperToolsPanel.tsx` renders only when
`__DEV__` is true, so it can never appear in a production build:

- RESET CASE 001
- CLEAR LOCAL SAVE
- UNLOCK ALL EVIDENCE
- COMPLETE CASE
- RESET EVIDENCE BOARD
- FORCE AUTOSAVE FLUSH

## Tests

`src/state/__tests__/persistence.test.ts` runs both acceptance runs against an
in-memory device-storage double, simulating relaunch by resetting the module
registry:

1. start CASE 001, collect evidence, move it on the board, create connections,
   write notes, close, reopen, confirm everything remains
2. progress further (hint, deduction, theory cluster, pinned timeline), kill the
   app, relaunch, confirm state remains

plus interrupted evidence viewing, write coalescing, backup recovery,
quarantine, partial-corruption repair, v4 migration, progression, and the
developer tools.
