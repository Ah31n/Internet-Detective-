# MOBILE-FIRST INTERACTION

Every interaction in INTERNET DETECTIVE follows one chain:

**TOUCH → GESTURE → STATE → MOTION → FEEDBACK**

The finger lands, a gesture is recognised on the native thread, deterministic
state changes, motion carries the change, and a restrained haptic or banner
acknowledges it. Nothing in the game is designed for a cursor.

## 1. Touch targets

`tokens.touch` fixes the ergonomics in one place:

| Token | Value | Use |
| --- | --- | --- |
| `minTarget` | 44 | absolute floor for any control |
| `comfortableTarget` | 48 | rails, sheet buttons, tab items |
| `hitSlop` | 8 all round | default on every `TactilePressable` |
| `wideHitSlop` | 14 all round | small glyph controls |
| `slopDistance` | 8 | travel allowed before a press becomes a drag |
| `longPressMs` | 420 | single long-press duration in the game |
| `doubleTapMs` | 260 | double-tap window |

`TactilePressable` applies `hitSlop` by default, so a painted 30 pt glyph is
still a 46 pt target. Controls audited and enlarged in this phase: board tray
close and error dismiss, CCTV markers, connection-kind chips, connection row
actions, hint request, deduction choices, document page dots, Case Net tool
buttons and search clear, settings close. Settings switches are no longer
thumb-sized: the entire row is the control and the `Switch` is a read-only
indicator.

## 2. Gestures

| Gesture | Where | Behaviour |
| --- | --- | --- |
| Tap | everywhere | compresses on press-in, springs back on release |
| Long press | board artifacts | lifts the card and opens artifact tools |
| Drag | board artifacts, sheets, inspector header | one-to-one finger tracking |
| Two-finger pan | evidence board | moves the wall, rubber-banded at the edges |
| Pinch | board, photos, CCTV stills | focal-point accurate |
| Double tap | board artifacts, evidence media | inspect / zoom to the tapped point |
| Sheet drag | every bottom sheet | detents, flick-to-dismiss, interruptible |
| Pull down | evidence inspector header | returns the file to the case |

Conflicts with system gestures are avoided rather than fought: the app is
portrait-locked, the board is a `fullScreenModal` with the stack's own swipe
disabled, artifact drags require a single pointer while wall gestures require
two, sheet drags use `activeOffsetY` so vertical scrolling still wins, the
inspector's dismiss drag fails on horizontal travel, and trays, legends, rails
and sheets are all pushed above the home indicator and the Android gesture bar.

## 3. Evidence viewer

`ZoomableSurface` backs photo and CCTV-still inspection: pinch keeps the
pinched point under the fingers, one finger pans only once the artifact is
larger than its frame, double tap zooms to the tapped detail and back, and
content springs inside its bounds the moment the fingers leave. Photo markings
can be hidden with a single toggle. Documents scroll vertically inside a page
and page horizontally between sheets, with a sheet counter and tappable page
marks. Metadata now lives in its own draggable sheet reached from the title
strip or the `DETAILS` rail button.

## 4. Evidence board

Dragging is physical: the card lifts (scale and shadow both grow), tilts with
both travel and speed, keeps its momentum on release, and settles with a soft
overshoot spring. Lift and landing each play one light haptic. Long press
opens the contextual tray; double tap goes straight to full-screen inspection.
While a string is being drawn the source artifact is outlined in rust and the
rest of the wall steps back slightly. The wall itself rubber-bands at its
limits so it can never be flung out of reach, and artifacts are memoised so
only the card that changed re-renders — all live motion stays on the UI thread.

## 5. Bottom sheets

`design-system/components/BottomSheet` replaces the old fixed panels:

- **draggable** — the grabber and header track the finger
- **interruptible** — a new drag adopts the sheet mid-spring
- **dismissible** — flick down, drag past the lowest detent, tap the backdrop,
  or use the Android back gesture
- **state-aware** — it settles on detents, reports the one it landed on with a
  light haptic, and fades its backdrop in proportion to how open it is

Used by the case-note, connections, and metadata sheets.

## 6. Safe areas

`Screen` is safe-area-aware by default. Surfaces that manage their own edges
(the board, the evidence inspector, Case Net) opt out of the bottom edge and
apply `useSafeAreaInsets` themselves, so nothing sits under the Dynamic Island,
the status bar, the home indicator, Android gesture navigation, or a rounded
corner. The feedback banner is positioned below the top inset.

## 7. Navigation context

`navigation/investigationContext` holds volatile context that is not case
truth: half-ticked deduction evidence, chosen accusation answers, and the
scroll offset of every investigation list. Tabs use `backBehavior="history"`.
Hub → Evidence → E-014 → People → Suspect and back therefore returns the
player to the same list, the same offset and the same working theory, while
persisted progress and the case itself are untouched.

## 8 & 9. Feedback and haptics

`core/feedback/transitionFeedback.ts` is a pure function of two engine states:
it decides what just happened and how loud it was. `useFeedbackBridge`
observes successful transitions and plays at most one haptic and one short
banner each.

| Event | Haptic | Banner |
| --- | --- | --- |
| Evidence recovered | medium impact | EVIDENCE RECOVERED |
| Evidence placed on the board | light impact | — |
| String pinned | medium impact | STRING PINNED |
| Contradiction marked | warning | CONTRADICTION MARKED |
| Deduction proven | success | DEDUCTION PROVEN |
| Timeline confirmed | success | TIMELINE CONFIRMED |
| Message or email opened | selection | — |
| Hint spent | selection | HINT SPENT |
| Case closed | success + one soft echo | CASE CLOSED |

Haptics never fire when the player has turned them off or on a device without
a taptic engine. Incidental feedback (taps, lifts, landings) is throttled to
one pulse per 55 ms so a gesture can never buzz continuously; significant
feedback is never swallowed. Case completion is the only two-beat pattern and
it does not repeat.

## 10. Performance

No looping animations, no blur layers, no particle systems. Board artifacts
are memoised and animate through shared values on the UI thread; the cork
texture is a static, precomputed array; scroll listeners are throttled to
160 ms; sheet and banner work is driven by Reanimated rather than React state.
`reduceMotion` downgrades every spring to an instant state change and disables
entry and exit transitions.

## Tests

`src/core/feedback/__tests__/transitionFeedback.test.ts` pins the feedback
vocabulary: one event per transition, silence for transitions that do not
deserve a buzz, and the two-beat completion pattern only on resolution.
