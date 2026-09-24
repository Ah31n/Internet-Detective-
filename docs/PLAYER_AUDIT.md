# FINAL PLAYER EXPERIENCE AUDIT — INTERNET DETECTIVE

Phase 19. Played, not read. The rule for this pass was that a finding only
counts if it is something a player would actually notice, and a fix only counts
if it changes what they see.

**Two screens failed and were redesigned. Everything else passed.** The fixes
are held in place by 13 new tests, because the failures were both regressions
of standards earlier phases had already set — which means judgement alone did
not keep them out.

---

## First 60 seconds

**Launch.** A brand seal fades up, a rust rule draws across, "INTERNET
DETECTIVE" sets in display type over "PRIVATE INVESTIGATION NETWORK", and a
restoration line reports the case file found on the device. Status bar hidden,
registration marks top and bottom, no white flash at any point. This reads as a
game from the first frame.

- **Fixed:** the launch plate printed `MOBILE FIELD SYSTEM / 0.1` — a literal
  that had drifted from the shipping version. It now reads the real version
  from the app config.

**Then the desk — and this is where the game failed.**

> ```
> ● INVESTIGATION DESK ONLINE
> Your field desk
> Enter the archive, review a brief, or return to the investigation room.
>
> DESK REGISTRY                                    05 DESTINATIONS
> 01  Case library        Browse installed investigation files
> 02  Case brief          Review the selected case mandate
> 03  Investigation room  Return to your last investigation tool
> 04  Detective record    Your rank, closed cases, and commendations
> 05  The anthology       The published series and collected editions
>
> 🔒 DESK POSITION IS RETAINED ON THIS DEVICE
> ```

Played cold, that is a **site map with a service-status widget on top**. A
green dot announcing a desk is "ONLINE" is SaaS health-check vocabulary. Five
numbered rows with icons and one-line descriptions is a directory. And the
question the brief asks — *does the player understand what to do?* — has no
good answer: a new player must choose between "Case library", "Case brief", and
"Investigation room" before knowing what any of them are, and **nothing on the
screen says start**.

### Redesigned: the desk

One object, one action.

```
   ◈ INTERNET DETECTIVE                                          ⚙
     FIELD DESK

     ┌──────────────┐
     │ CASE 001     │
   ┌─┴──────────────┴───────────────────────────────────┐
   │ CONFIDENTIAL — MUSEUM THEFT                        │
   │                                                    │
   │ THE MISSING                                        │
   │ DIAMOND                                            │
   │ ────────────────────────────────────────────────── │
   │ 34 OF 48 ARTIFACTS RECOVERED · 2 DEDUCTIONS PROVEN │
   │                                                    │
   │ RESUME INVESTIGATION  →                            │
   └────────────────────────────────────────────────────┘

              ARCHIVE  │  RECORD  │  ANTHOLOGY
```

The case file is paper on a dark desk — the same stock the briefing dossier is
printed on, so opening it is continuous with what happens next rather than a
jump to a different screen. It has a folder tab, a classification line, a drop
shadow that sits it on the desk, and a state line in words.

The action names itself for whatever state the investigation is in:

| State | Reads |
| --- | --- |
| Never opened | `OPEN THE CASE FILE` |
| Brief not yet read | `READ THE BRIEF` |
| In progress | `RESUME INVESTIGATION` |
| Solved | `READ THE CASE REPORT` |

Everything else is one quiet line of three words at the bottom. Gone: the
status dot, the registry, the numbered destinations, the descriptions, the
retention disclaimer, and the `NavLedgerRow` component itself.

---

## First 5 minutes

| Surface | Verdict |
| --- | --- |
| Case briefing | **Pass.** A dossier lands on the desk at a slight tilt, then closes into the investigation instead of cutting to it. |
| Investigation hub | **Pass.** Current scene, then the locations reachable from it, with a resume strip for wherever you stopped. |
| Evidence discovery | **Pass.** Entering a scene surfaces artifacts; the index numbers them E-01 upward. |
| Evidence viewing | **Pass.** Eight artifact types, eight purpose-built viewers. Photographs pinch to zoom. |
| Suspect investigation | **Pass.** People carry relationships and statements, not stat blocks. |
| Messages | **Pass.** Typeset as threads, not as a chat UI. |
| Websites | **Pass.** Six fictional sites, each with its own identity, in a browser that is clearly an investigation tool. |
| CCTV | **Pass.** Monitor chrome, scanlines, timeline markers, transcript. |
| Timeline | **Pass.** Events legible once a sourcing artifact is held; pinning is a deliberate act. |

**Does the player feel like a detective?** Yes. The game never summarises the
case for you. It gives you documents and lets you be wrong.

---

## Does the interface communicate the mechanics?

Checked against the instruction not to add tutorials unless the interface
genuinely fails.

| Mechanic | How it teaches itself |
| --- | --- |
| Evidence | Numbered index; tap opens a viewer. Self-evident. |
| People | Named, with relationships drawn between them. |
| Timeline | Chronological, with a pin affordance on each row. |
| Board | Cards on cork. One finger drags — the universal affordance for a loose object. Tap raises a tray naming every tool: Connect, Contradict, Group, Theory, Inspect. |
| Theory | Reached from that tray, after selecting cards. |
| Conclusion | The deduction desk states the question and asks you to choose evidence for it. |

**No tutorial added, deliberately.** The one thing the board cannot teach by
demonstration is two-finger pan, and that is the standard companion gesture to
pinch on any canvas, with a recenter control in the header as the safety net.
Adding a coach overlay to a game whose entire proposition is *work it out
yourself* would undercut the game to solve a problem it does not have.

---

## Mobile feel

Touch only; no mouse, hover, or keyboard path exists anywhere — now asserted by
test.

| Gesture | Where |
| --- | --- |
| Tap | Everywhere; every target ≥ 44 pt |
| Swipe | Scroll, tab switching, bottom-sheet dismissal |
| Drag | One-finger card movement with spring settle and tilt |
| Pinch | Board zoom, focal-point accurate; photo inspection to 5× |
| Two-finger pan | Board viewport, rubber-banded at the edges |
| Long press | 430 ms to raise artifact tools, with a lift and a haptic |
| Bottom sheet | Drag to dismiss, with velocity |

Haptics are graded: selection, lift, placement, confirmation. Nothing buzzes
without cause.

---

## Interruption

`launch → background → foreground → navigate → background → return` runs as an
automated test and asserts the serialised session is **byte-identical** across
both round trips — note text, board placement coordinates, viewport scale,
contradiction links, pinned events, open artifact, settings, entitlements.
Twenty-five rapid drags with no flush in between also survive an interrupted
background.

The investigation continues exactly where expected.

---

## Case solution

Staged, and restrained: **theory → confirmation → the evidence that carried it
→ the night in order → the case report.** Roughly five seconds, one haptic, one
audio cue. No confetti, no score animation, no share prompt. The reconstruction
is the reward — you watch the night you assembled play back in order.

---

## Anti-website audit

Every screen inspected against the reject list.

| Pattern | Result |
| --- | --- |
| Website navbar | None. Bottom tabs inside the investigation only — a native convention. `HUB` renamed to `CASE`, the last piece of app-speak in the labels. |
| Hero section | None. |
| **SaaS dashboard** | **One found and removed** — see below. |
| Generic card grid | None. The board is one object; the anthology is a contents page. |
| Marketing CTA | None. Asserted by test. |
| Pricing page | None. The anthology is bound volumes with the price set quietly in the margin; no comparison table, no flags. |
| Admin panel | None. The QA console exists but is not in the production binary. |
| Responsive desktop layout | None. No breakpoints, no `isDesktop`. |
| AI dashboard | None. No AI anywhere in the product. |
| Wrapped web page | None. `react-native-webview` is not a dependency; the in-game internet is native. |

### The second failure: a dashboard grid in Settings

Settings carried a "DETECTIVE RECORD" block rendered as a **six-cell,
two-column grid of LABEL / VALUE tiles** — level, experience, achievements,
cases closed, time on case, and *last screen*. Three problems at once:

1. It is a stat-tile dashboard, the exact pattern Phase 15 was told to keep out
   of the detective profile.
2. It duplicated the Detective Record screen, which presents the same figures
   properly as a typeset ledger with leader rules.
3. `LAST SCREEN: /INVESTIGATION/EVIDENCE` printed an **internal route path to
   the player**.

Replaced with a single quiet line that carries the player's rank and case count
and opens the Detective Record. The grid, the tile component, and the route
readout are gone.

---

## The final question

> *Beside Monument Valley, The Room, and Alto's Odyssey — same category?*

The honest answer on presentation and interaction: **yes.** It opens on a
cinematic identity sequence, not a menu. Its front door is a physical case file
you open. Its core interaction is a corkboard you drag, pan, pinch, and pin
string across, with springs and graded haptics. Its content is typeset —
documents, photographs, receipts, surveillance stills — in a consistent
editorial language with no generic component anywhere. It makes no network
request, so nothing ever spins. It asks nothing of you: no account, no ads, no
timers.

Where it is not yet equal to those three: **they each carry an original art
direction executed by a specialist** — Monument Valley's architecture, The
Room's modelled objects, Alto's light. INTERNET DETECTIVE's visual language is
strong, coherent, and genuinely its own, but it is typography, paper, and
photography rather than a bespoke rendered world. That is a legitimate
direction for this genre, and it is well executed. Closing the remaining
distance is an art-direction investment, not an engineering one — and it is the
honest next step, not something this phase can claim to have done.

---

## Gate

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npx vitest run` | **274 / 274 across 23 files** |
| `npx expo-doctor` | 21 / 21 |
| `npm run verify:release` | PASS on iOS and Android |

Case 001's content, canonical solution, and engine were not touched.
