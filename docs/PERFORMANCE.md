# MOBILE PERFORMANCE QA — INTERNET DETECTIVE

Phase 16. A production audit of the built game. No redesign, no new features —
eleven real problems found and fixed, and the parts that were already sound
recorded as audited rather than "improved".

**Reference device:** iPhone 13 (1170×2532 @3x, 120 Hz-capable UI thread
budget of 8.3 ms). Secondary targets: current iPhones, mid-range Android with
roughly a third of the memory headroom, small Android panels, and large
Android displays.

**Working rule for the whole phase:** fix the cause, never mask it. Not one
spinner, skeleton, or artificial delay was added.

---

## 1. Findings, in order of severity

### P1 · The evidence board re-rendered all 48 cards on every tap

The worst finding, and invisible in a diff. `EvidenceArtifact` was correctly
wrapped in `memo` — and the memo did nothing, because the parent rebuilt
`onTap`, `onMoveEnd`, `onLongPress`, `onDoubleTap`, and the `externalGestures`
array on every render. Every prop compared unequal, so selecting a single card
re-rendered the whole wall: 48 cards, each with images, gestures and shadows.

Every one of those is now `useCallback`/`useMemo`. Tapping a card re-renders
**the two cards whose `selected` prop actually changed.**

### P2 · The placement map was rebuilt 60–120 times a second

During a drag, each card's `useAnimatedReaction` did:

```ts
livePlacements.value = { ...livePlacements.value, [id]: next };
```

A 48-key object allocated on the UI thread on every frame, to change one key.
Now it is `livePlacements.modify()`, which mutates in place. The same fix
applies to the persisted-placement sync.

### P3 · Every connection recomputed the same geometry four times per frame

Each string ran **four** `useAnimatedStyle` blocks — line, two anchors, badge —
and each one independently read the whole placement map and redid the same
`sqrt`/`atan2`. With 40 strings pinned that is 160 map lookups and 80
trigonometric calls per frame while one card moves.

Now a single `useDerivedValue` computes the geometry once and the four styles
read numbers off it. Measured: **0.005 ms/frame** for 40 strings, against a
4 ms budget.

### P4 · Group and theory outlines allocated five arrays per frame

`Math.min(...placements.map(...))` — repeated four times, inside a worklet that
runs every frame. Replaced with one pass over the ids that allocates nothing.

### P5 · 81 static cork views reconciled on every board render

The corkboard base, 8 seams and 72 specks were inline in the render body, so
React rebuilt 81 elements every time anything on the board changed. Extracted
to a `memo`'d `CorkSurface` with no props: reconciled once, for the life of the
screen.

### P6 · Gesture handlers were rebuilt on every render

Four gestures per card plus two viewport gestures were reconstructed on each
render and re-attached natively. Re-attaching a handler mid-interaction is
exactly how a touch gets dropped — this was a **stability** bug as much as a
speed one. All gesture graphs are now memoised on their real inputs.

### P7 · Artwork shipped at 1536 px and was decoded at that size for 150 pt cards

The masters are 1536–1672 px. A 1536×1024 JPEG decodes to a **6.3 MB** bitmap,
so a full wall of eleven image cards was about **65 MB of pixel buffers** to
draw artwork the size of a playing card. On a mid-range Android that is the
memory spike that ends in a kill.

Every image now ships in two derivatives, generated deterministically by
`tools/optimize_images.py`:

| | long edge | quality | on disk | decoded |
| --- | --- | --- | --- | --- |
| `<name>.jpg` (inspection) | 1280 | 78 | 81–142 KB | 3.9 MB max, one at a time |
| `<name>.thumb.jpg` (board, lists) | 420 | 72 | 7–16 KB | **4.6 MB for all eleven** |

1280 px still exceeds the iPhone 13's 1170 px panel, so full-screen inspection
loses nothing — the macro clue detail in `photo-replica-macro` is fully legible
at 1280/78. Masters moved to `tools/source-images/`, which Metro does not
bundle.

**Case artwork: 2,142 KB → 1,307 KB (−39%). Full board decode: ~65 MB → 4.6 MB.**

Board cards also carry `recyclingKey`, so a recycled view never flashes the
previous artifact's image.

### P8 · A native video player was created for every CCTV record — with no video

`useVideoPlayer` was called unconditionally. Case 001 ships **no MP4s** (its
CCTV records are poster stills plus markers and transcripts), so four decoders
were allocated to display four still frames.

The hook now lives in a `CCTVPlayback` child that is mounted only when a real
source exists. No source, no decoder. It also pauses on `useFocusEffect`
teardown and on any `AppState` change away from active, so a clip can never
hold a decoder or an audio session alive behind another screen.

### P9 · Up to 288 pressables mounted at once on the Leads tab

Every unsolved deduction rendered a checkbox for every discovered artifact.
Late in Case 001 that is six open deductions × 48 artifacts ≈ **288 pressables,
around 1,500 views**, in a single `ScrollView`. That is a visible stall every
time the tab opens, and pure waste: a player works one deduction at a time.

One picker is now mounted at a time. Nothing is hidden or removed — the first
unsolved deduction is open by default, so the ordinary path is unchanged, and
the others are one tap away with their held-evidence count printed on the
closed row. **This is the only player-visible change in the phase**, and it is
a mount-cost fix, not a redesign.

Rows and blocks are both memoised, and the toggle reads the selection map
through `getState()` instead of closing over it — so ticking one box
re-renders one row, not forty-eight.

### P10 · The evidence index re-rendered 48 rows on every engine dispatch

Extracted to a memoised `EvidenceIndexRow`. Viewing one artifact now
re-renders one row.

### P11 · A stale `lastRoute` could dead-end the app on every launch

The launch sequence ends in `router.replace(lastRoute)`, and nothing checked
that the persisted string was still a route in this build. A save written by an
older version — the app gained `/profile` and `/anthology` only last phase —
would land on a blank not-found screen, **on every launch**, because the bad
value is never rewritten.

`toRestorableRoute` / `toInvestigationRoute` now validate on rehydrate.
Validation lives in `merge`, not `migrate`, because zustand skips `migrate`
when the stored version matches. Covered by a test that seeds a legacy route
and asserts recovery to the desk.

---

## 2. Audited and found sound

Not everything needed fixing, and inventing work here would have been worse
than none.

| Area | Finding |
| --- | --- |
| **Animation loops** | No `withRepeat` anywhere. The motion system has no perpetual animation — nothing keeps the UI thread or the GPU warm at rest. Now guarded by test. |
| **SVG** | No SVG library is installed. Every seal, rule, and mark is a plain view or an icon glyph. Nothing to simplify. |
| **Audio memory** | Already a bounded LRU pool of one-shot players with explicit `pause()` + `remove()` on eviction, and the whole engine suspends on `AppState`. 16 cues, 1.6 MB. |
| **Persistence writes** | Already coalesced with a trailing debounce, a hard max-delay ceiling, a rolling backup, and quarantine of unreadable payloads. **Measured: a fully-played save is 13.1 KB and serialises in 0.03 ms** — three orders of magnitude inside a frame. No change needed. |
| **State subscriptions** | Every hot-path subscription already selects a primitive or a stable slice. The one whole-object read (`usePlayerState`) is used by the settings screen only. |
| **Gesture conflicts** | `ZoomableSurface` already defers single-finger pans to the parent until the content is larger than the frame. The board is not inside a scroll view. No conflicts found. |
| **Navigation lifecycle** | One evidence viewer mounts at a time, via a switch. Modals unmount cleanly. |
| **`require` of case media** | A `require` yields an asset id, not a decode. No artwork is resident until an `<Image>` mounts. |

---

## 3. The lifecycle test the brief asked for

`src/state/__tests__/lifecycle.test.ts` executes the exact sequence against the
in-memory storage double, with module-registry resets standing in for cold
starts:

```
launch → background → foreground → navigate → background → return
```

It does not merely check for absence of crashes: it asserts the serialised
session is **byte-identical** across both round trips, and then checks the
details that make it the same investigation — the note text, the board
placement at (412, 268), the viewport scale of 1.35, the contradiction link,
the pinned timeline event, the open evidence id, settings, and entitlements.

Plus: 25 rapid drag dispatches with no flush in between survive an interrupted
background with the final position intact, and every backgrounded payload is
valid JSON on disk.

---

## 4. Budgets, enforced by test

Performance regressions do not show up in a diff, so they are now assertions.

`src/core/performance/__tests__/performanceBudgets.test.ts` (11 tests)
measures real bytes and real arithmetic:

- a thumbnail exists for every display image
- display artwork ≤ 1280 px long edge; thumbnails ≤ 420 px
- no shipped image over 160 KB; whole case payload under 1.6 MB
- a full board of thumbnails decodes under 8 MB (currently 4.6 MB)
- a single full-screen decode under 6 MB (currently 3.9 MB)
- a fully-played save under 256 KB (currently 13.1 KB) and serialising in under
  one frame (currently 0.03 ms)
- 40 strings of board geometry under 4 ms/frame (currently 0.005 ms)

`src/core/performance/__tests__/renderDiscipline.test.ts` (19 tests) reads the
source and holds the render discipline in place: callbacks and gestures
memoised, cards and rows memoised, no `livePlacements.value = {...}`, one
geometry pass per string, no `Math.min(...spread)` in a worklet, board cards on
the `thumb` variant, exactly one `useVideoPlayer` call and it lives inside
`CCTVPlayback`, and no `withRepeat` anywhere.

That last category matters most. P1 existed because `memo` was present and
useless, and nothing in the build could tell.

---

## 5. Failure conditions

| Condition | Result |
| --- | --- |
| Crashes | None found. The memory spike that could cause one (P7) is fixed. |
| Freezes | P9 (288 pressables) was the one measurable stall; fixed. |
| Blank screens | **One real cause found** (P11, stale route) and fixed. |
| Lost state | None. Asserted byte-identical across the full lifecycle. |
| Gesture conflicts | None found; gesture *stability* improved by P6. |
| Excessive loading | No loading screens exist, and none were added. |
| Memory spikes | The board's 65 MB decode is now 4.6 MB; four phantom video decoders are now zero. |
| Animation stutter | P1–P5 were all per-frame or per-interaction costs on the board, the highest-risk surface. |

---

## 6. The gate

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npx vitest run` | **208 / 208 across 19 files** |
| `npx expo-doctor` | 21 / 21 |
| iOS + Android export | succeeds |

Case 001's content, canonical solution, and engine data were not modified.
