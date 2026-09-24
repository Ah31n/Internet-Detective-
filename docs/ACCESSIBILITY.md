# ACCESSIBILITY — INTERNET DETECTIVE

Phase 14. The rule the whole phase is built on:

> **An accessible detective game is still a detective game.**
> Nothing here adds a "mode" that flattens the visual language into a generic
> high-contrast shell. The corkboard is still a corkboard, the paper is still
> aged, the seals are still rust. What changes is that every word can be read,
> every control can be reached and named, and no meaning is carried by colour
> alone.

Accessibility is treated as part of the craft, not a compliance pass bolted on
the end: it is enforced by tests in the same gate as typecheck and lint.

---

## 1. The three player-facing levers

All three live in **Settings → ACCESSIBILITY**
(`src/features/settings/components/AccessibilityPanel.tsx`) and persist in the
app shell store (`internet-detective.app-shell`, schema v3).

| Lever | Values | What it does |
| --- | --- | --- |
| **Text size** | Standard ×1 · Large ×1.15 · Larger ×1.3 | Multiplies the type ramp *on top of* the operating system's own Dynamic Type setting. |
| **High contrast** | on / off | Promotes every muted, tinted or decorative text colour to its most legible sibling. Hue is preserved; only luminance moves. |
| **Reduce motion** | on / off | Honoured by the motion system, route transitions, reveals, the conclusion sequence, and the evidence board. |

The text-size control renders each option's swatch **at the size it selects**,
so the choice is previewed rather than described. The three rows are a real
radio group (`accessibilityRole="radiogroup"` / `"radio"`), the two toggles are
real switches (`accessibilityRole="switch"` with `accessibilityState.checked`).

---

## 2. Text: one primitive, one place to get it right

Every string in the game goes through `AppText`
(`src/design-system/components/AppText.tsx`). Nothing renders a raw
`<Text>` — **a test fails the build if one appears**. Routing everything
through one primitive means scaling, the contrast mapping, and the Dynamic Type
clamp are applied once and cannot be forgotten.

### Type floor

The smallest size in the game is **12 / 16** (`caption`). Evidence IDs,
timestamps, and metadata all live there, so there is no 10pt text anywhere —
including the investigation tab bar, which was raised from 10 to 12.

### Per-variant scaling ceilings

Body copy can grow a long way; a 38pt serif display heading cannot, or it
pushes controls off screen. Each variant has its own ceiling on the combined
OS + in-game scale:

| Variant | Max multiplier |
| --- | --- |
| `display` | 1.4 |
| `title` | 1.5 |
| `body`, `bodySmall` | 1.9 |
| `label`, `mono` | 1.7 |

### The one deliberate exception: `fixedScale`

Text printed **onto a fixed-size object** — the faces of the cards pinned to
the evidence board — is capped at ×1.15 and ignores the in-game scale. Growing
that type would overflow the card rather than help anyone, and the wall is a
*spatial map*, not a reading surface. Those same words are fully scalable in
evidence inspection, one tap away. This is the only opt-out in the codebase and
it is a named, documented prop.

### Layout that survives scaling

Fixed row heights clip scaled type, so text-bearing rows use `minHeight` plus
vertical padding. A test walks every `StyleSheet` in `src/`, finds every style
with `flexDirection: 'row'`, and fails if it also sets a hard `height` — with a
single allow-listed exception for a receipt barcode, which is pure ornament.
Titles that used to clamp to one line now wrap to two.

---

## 3. Colour: contrast held by test, not by eye

`src/design-system/theme/contrast.ts` implements the WCAG relative-luminance
and contrast-ratio maths. `src/design-system/theme/__tests__/contrast.test.ts`
checks **every text colour against every surface it can be printed on** and
fails below AA (4.5:1).

Two colours in the palette were never legible as text and are now never used as
text: `rust` and `moss` are *seal and rule* colours. `AppText` maps them
automatically before they are ever drawn:

| Authored | Printed as | On dark surfaces |
| --- | --- | --- |
| `rust` | `rustText` `#D4836B` | ≥ 4.62:1 |
| `moss` | `mossText` `#8CA678` | ≥ 4.99:1 |

On paper surfaces the inks were deepened so they clear AA on **aged** paper
(`#BEB397`), not just fresh paper:

| Ink | Value | On `paperMuted` | On `paper` |
| --- | --- | --- | --- |
| `rustInk` | `#6E2A1E` | 5.01:1 | 7.71:1 |
| `mossInk` | `#2D3D22` | 5.60:1 | 8.62:1 |

High contrast raises these further — and a test asserts it **only ever raises,
never lowers**, for every mapped colour.

---

## 4. Colour is never the whole message

The most consequential state in the game is a **contradiction**. It used to be
a red dot on a string. Now, everywhere it appears, colour is paired with an
icon *and* the literal word:

- **Board string** — a pill reading `✕ CONTRADICTION`, not just a red line.
- **Board header** — an `alert-circle` glyph plus a counted tally, merged into
  the `N ITEMS · N STRINGS` summary.
- **Feedback banner** — accent colour + glyph + title text, and the banner is
  announced politely to screen readers as it appears.

A test asserts the contradiction surface still contains both the icon and the
word, so this cannot silently regress into colour-only.

---

## 5. Screen reader

### Every control has a name

A source audit enumerates every `TactilePressable` and `Pressable` in `src/`
and fails the build if any lacks an `accessibilityLabel`. This found **27
unnamed controls**, all now labelled. `GameButton` derives its label from its
string children automatically, so plain-text buttons stay correct by default
and callers can still override.

### Evidence cards describe themselves

`describeArtifact()` builds a full sentence for each card on the board:

> "Open Gallery Four camera log. CCTV evidence. identifier photo replica macro.
> selected."

with a hint covering inspect, tools, and drag, plus
`accessibilityState.selected`. `describeBoardTally()` does the same for the
board summary. Both are exported pure functions and therefore testable.

### Structure

Screen titles carry `accessibilityRole="header"`, the board wrapper is a
`summary`, and the feedback banner is an `alert` with
`accessibilityLiveRegion="polite"` and an explicit
`announceForAccessibility` call — so an event is *heard* without focus being
yanked away from wherever the player was.

---

## 6. Touch

From `tokens.touch`: `minTarget: 44`, `comfortableTarget: 48`, `hitSlop: 8`,
`slopDistance: 8`, `longPressMs: 420`. Narrow visual controls (the audio and
text-size step bars, 30pt wide) keep their slim look but carry hit slop that
lifts the effective target to 46pt. Tab bar items are at the comfortable
target. A test asserts the tokens never drop below the platform minimum.

---

## 7. Reduced motion

Reduce motion is honoured in 20 modules, including the launch sequence, route
transitions, evidence reveals, the bottom sheet, the conclusion sequence, and
the banner. The **board** has an explicit contract, because it is the most
physical surface in the game:

- card rotation forced to `0` — no resting tilt, no drag tilt, no lift rotation
- scale response reduced from a spring `1.05` to a flat `1.02`
- placement changes **assigned directly** instead of `withSpring`

The board stays fully playable; it simply stops moving in ways that are
decorative rather than informative. This is the motion rule from Phase 12,
applied to a player setting rather than a design review.

---

## 8. The standing gate

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npx vitest run` | **108 / 108 across 11 files** |
| `npx expo-doctor` | 21 / 21 |
| iOS + Android export | succeeds |

Accessibility-specific suites:

- `src/design-system/theme/__tests__/contrast.test.ts` — 12 tests: reference
  ratios, AA across every text/surface pair, the "surface colours are never
  text" rule, high contrast never reduces contrast, 12pt type floor, line
  heights, scaling ceilings, touch tokens.
- `src/design-system/__tests__/accessibilityAudit.test.ts` — 5 tests reading
  the TSX itself: every pressable named, no raw `<Text>`, contradiction is
  never colour-only, no fixed heights on text-bearing rows.

The audit tests are the important ones. Accessibility rots silently — a control
added next month with no label is invisible to a screen reader and nothing else
in the build would complain. Now the build complains.
