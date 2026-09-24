# MOTION — Phase 12

Motion in INTERNET DETECTIVE is quiet, physical, deliberate, cinematic, and
tactile. It is never decorative.

**The rule:** if an animation attracts attention to itself instead of to the
investigation, it is removed. Motion exists to say *something arrived*,
*something settled*, *something was confirmed* — nothing else.

Phase 12 changed no information architecture and no case logic.

---

## 1. Foundation

`src/design-system/motion/motionSystem.ts` (+ the pure `motionTiming.ts`)

| Piece | Value |
| --- | --- |
| `curve.emerge` | `Easing.out(cubic)` — arrivals decelerate |
| `curve.recede` | `Easing.in(cubic)` — departures accelerate |
| `curve.settle` | `Easing.inOut(quad)` — things coming to rest |
| `curve.sweep` | `Easing.inOut(cubic)` — a pass across a surface |
| `duration` | `flick 140 · brief 220 · reveal 320 · unfold 420 · cinematic 680` |
| `stagger(i, step 55, cap 440)` | sequential arrival, capped so a long list is never a wait |
| `revealIn` / `settleIn` / `liftIn` / `fadeOut` | entering/exiting builders |
| `useStagedSequence(count, hold, enabled)` | short held cinematic runs |
| `useReduceMotion()` | reads `settings.reduceMotion` |

**Reduced motion is a first-class path.** Every builder returns `undefined`,
every sequence jumps to its final stage, and every route animation becomes
`'none'`. Nothing is merely faster — it is simply already there.

Nothing in the game loops. No idle pulses, no attention-seeking repeats.

---

## 2. App launch

`AppLaunchScreen.tsx` — three held stages of 300 ms.

1. Seal and wordmark fade and scale into place.
2. A rule sweeps and the restoration line appears (`CASE ID · TITLE`, or
   `NO ACTIVE CASE FILE`).
3. Restoration detail — `CASE CLOSED · ARCHIVE READY`,
   `INVESTIGATION STATE RESTORED`, or `LOCAL ARCHIVE READY`.

Then `router.replace(lastRoute)` after 240 ms. The sequence exists to make the
restore legible, not to delay the player. Reduced motion leaves immediately.

---

## 3. Case opening

`CaseLibraryScreen.tsx` files arrive in sequence, as if read out of a drawer.

`CaseBriefScreen.tsx` is a dossier landing on a desk: opacity, `translateY`
14 → 0, `scale` 1.015 → 1, tilt −1.7° → −0.4°. **The case number never moves** —
it is the anchor the rest of the page settles around. Title `settleIn`, then
summary, metadata band and stamp, then the objectives staggered.

---

## 4. Brief → investigation

Not a page switch. The brief closes on itself (220 ms, `scale` 0.985,
`opacity` 0.45), the route cross-fades (260 ms), and the investigation hub
assembles in the order the brief left off: current scene first, then the
available scenes staggered beneath it.

---

## 5. Evidence reveals

`src/features/evidence/components/EvidenceReveal.tsx`. Each artifact arrives the
way its physical counterpart would — no two share an animation.

| Type | Behaviour |
| --- | --- |
| Photo | `PhotoReveal` — the print develops: fades up, eases from 1.035 to true size |
| Document | `DocumentUnfold` — the sheet unfolds downward from its top edge (`transformOrigin: top center`), page by page |
| Message | `ConversationReveal` — the thread is read in order; incoming and outgoing sides enter differently |
| Receipt | `ArtifactEnter` — the slip is laid on the inspection desk and springs straight from −1.6° |
| CCTV | `SurveillanceActivate` — the monitor acquires signal, with a single sweep down the frame that never repeats |
| Webpage | `PageLoad` — the capture paints in from the top: notice, header, hero, body |
| Email | `PageLoad` — header, then message, then attachments |
| Statement | `DocumentUnfold` — form, transcript, signature |

---

## 6. Evidence board

Unchanged and already physical: lift to `scale` 1.05 with a deepening shadow,
tilt that follows both travel and velocity (`translationX/90`, `velocityX/900`,
clamped), velocity-carried release, and a soft settle spring that rocks once
and stops.

---

## 7. Connections and contradictions

`BoardRelations.tsx`. A new string is **pulled taut** rather than appearing: the
origin anchor pin fades in, then the line draws along its own axis
(`scaleX` 0 → 1 from `left center`, 320 ms), and the far anchor lands as it
arrives. Anchors make a connection read as pinned to both artifacts.

A contradiction is *noted*, not celebrated: a subtle haptic, the dashed red
string, then the `×` badge settling once from 1.12 to 1. No explosion, no
confetti, no "CORRECT!".

---

## 8. Timeline

Events enter once, staggered, in the order they happened, and then stop.
A confirmed (pinned) event is marked by its brass dot, rule and bookmark —
by state, not by movement. Nothing on the timeline animates continuously.

---

## 9. Conclusion and case closed

`CaseConclusionSequence.tsx` — five held stages of 820 ms:

1. **THEORY** — the accusation, with deductions proven and evidence recovered.
2. **CONFIRMATION** — the resolution headline and score.
3. **EVIDENCE MONTAGE** — the artifacts that carried the theory, staggered in.
4. **RECONSTRUCTION** — the night, in order, from the known timeline.
5. **CASE REPORT** — the explanation, a single restrained completion haptic,
   and the `CASE CLOSED` stamp pressing down (`scale` 1.35 → 1, `curve.recede`)
   rather than bouncing.

Under reduced motion the whole report is present at once, haptic included.

---

## Verification

`npm run typecheck` · `npm run lint` · `npx vitest run` (67 tests / 6 files) ·
`npx expo-doctor` (21/21) · `npx expo export` for iOS and Android.
