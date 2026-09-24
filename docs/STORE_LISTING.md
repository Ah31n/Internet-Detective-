# STORE LISTING — INTERNET DETECTIVE

Everything the App Store and Google Play consoles will ask for, written and
ready to paste. Nothing here is published, and nothing here is invented:
values that depend on accounts or hosting you own appear as `PLACEHOLDER_*`.

---

## 1. Identity

| Field | Value |
| --- | --- |
| App name | **INTERNET DETECTIVE** |
| iOS bundle identifier | `com.internetdetective.game` |
| Android package | `com.internetdetective.game` |
| Version | `1.0.0` |
| iOS build number / Android versionCode | `1` / `1` (EAS increments from here) |
| Primary category | Games → Puzzle |
| Secondary category | Games → Adventure |
| Price | Paid-free download, Case 001 included; further cases sold as one-time purchases |

**App Store subtitle** (30 characters max):

```
A case file in your pocket
```

**Google Play short description** (80 characters max):

```
A detective mystery you actually solve. Evidence, contradictions, deduction.
```

---

## 2. Description

Both stores take the same body copy. App Store allows 4,000 characters; this is
well inside it.

```
A forty-two carat diamond is gone from a sealed case, in a room full of
witnesses, in front of four cameras that recorded nothing unusual.

You are not told who did it. You work it out.

INTERNET DETECTIVE is a mystery game about actual investigation. You gather
evidence, read it closely, notice when two accounts cannot both be true, and
prove what happened — or you accuse the wrong person and find out why you were
wrong.

CASE 001 — THE MISSING DIAMOND
Forty-eight pieces of evidence. Six suspects. Ten locations. A theft with a
single correct solution, fixed before you ever open the file.

THE EVIDENCE BOARD
A corkboard you actually use. Drag cards with one finger, pan with two, pinch
to see the whole wall. Run string between things that connect. Mark a
contradiction in red when two pieces of evidence cannot both be true. Your
board is exactly where you left it, every time you come back.

READ EVERYTHING
Photographs, documents, receipts, messages, emails, surveillance stills, and
witness statements, each in a viewer built for it. Pinch into a photograph to
find the detail nobody mentioned.

A CLOSED INTERNET
Six fictional websites, each with its own design, none of them connected to the
real internet. Everything you need is inside the case.

DEDUCTION, NOT GUESSWORK
Build a theory from specific evidence and test it. The game never tells you the
answer. It tells you whether your reasoning holds.

NO NONSENSE
No advertising. No energy meters. No lives. No loot boxes. No countdown timers.
No account. No connection required — the whole case is on your phone.

Case 001 is free and complete. Further cases are bought once and owned for
good.
```

**Keywords** (App Store, 100 characters, comma-separated, no spaces):

```
detective,mystery,crime,puzzle,investigation,evidence,deduction,noir,case,whodunit,offline,story
```

---

## 3. Graphics

### App icon — ready

| Asset | Spec | Status |
| --- | --- | --- |
| Master icon | 1024 × 1024 PNG, no alpha, no rounded corners | `assets/images/icon.png` ✅ |
| Android adaptive foreground | 432 × 432 PNG with alpha, safe zone 66dp centre | `assets/images/android-icon-foreground.png` ✅ |
| Android monochrome | 432 × 432 PNG, silhouette only (themed icons) | `assets/images/android-icon-monochrome.png` ✅ |
| Play Store listing icon | 512 × 512 PNG, 32-bit with alpha | Export from the 1024 master |

### Screenshots — to capture

Capture from a release build on device or simulator, in this order. The order
is the pitch: the board first, because it is what makes the game look like
nothing else on the shelf.

| # | Screen | Caption |
| --- | --- | --- |
| 1 | Evidence board, mid-investigation, with a contradiction marked | *Pin it. String it. Prove it.* |
| 2 | Photo viewer zoomed into the replica macro | *The detail nobody mentioned.* |
| 3 | Evidence index with the case loaded | *Forty-eight pieces of evidence.* |
| 4 | A fictional website in the in-game browser | *An internet that only exists in this case.* |
| 5 | Deduction desk with evidence selected | *Test a theory. Not a hunch.* |
| 6 | Detective record | *Your record, kept on your device.* |

**Required sizes**

| Store | Requirement |
| --- | --- |
| App Store — 6.9" iPhone | 1320 × 2868 or 2868 × 1320, up to 10, **mandatory** |
| App Store — 6.5" iPhone | 1242 × 2688 or 1284 × 2778, up to 10 |
| Google Play — phone | 1080 × 1920 minimum, 2–8 required, 16:9 or 9:16 |
| Google Play — feature graphic | **1024 × 500 PNG or JPEG, no alpha, mandatory** |

The feature graphic should be the case file on a desk with the wordmark — no
device frames, no screenshot collage, no marketing badges.

### Optional

- App Store app preview video: 15–30 s, portrait, no captured audio. Show a
  drag, a pinch, and a contradiction being marked.
- Play promo video: a YouTube URL. Leave blank rather than rushing one.

---

## 4. URLs — placeholders, to be filled from hosting you control

Both stores require a reachable privacy policy URL before release. **Do not
substitute a plausible-looking link**; a dead policy URL is a rejection and a
credibility problem.

| Field | Required by | Value |
| --- | --- | --- |
| Privacy policy URL | App Store + Play (mandatory) | `PLACEHOLDER_PRIVACY_POLICY_URL` |
| Support URL | App Store (mandatory) | `PLACEHOLDER_SUPPORT_URL` |
| Marketing URL | App Store (optional) | `PLACEHOLDER_MARKETING_URL` |
| Support email | Play (mandatory) | `PLACEHOLDER_SUPPORT_EMAIL` |

`docs/PRIVACY.md` contains the full policy text, ready to publish at whatever
address you choose.

---

## 5. Age rating

Answer the questionnaires from the facts below. Do not pre-select a rating —
both stores compute it, and a mismatch between the answers and the content is
what causes problems.

| Question | Answer |
| --- | --- |
| Violence, realistic or cartoon | **None.** A theft is investigated; nobody is harmed on screen or in text. |
| Blood, gore, horror | **None.** |
| Sexual content, nudity, suggestive themes | **None.** |
| Profanity or crude humour | **None.** |
| Alcohol, tobacco, drugs | **None.** |
| Simulated gambling | **None.** |
| Contests, prizes | **None.** |
| Crime / criminal themes | **Yes — mild.** The subject is a non-violent property theft, treated as a puzzle. |
| User-generated content, chat, social features | **None.** |
| Shares user location | **No.** |
| Unrestricted web access | **No.** The in-game browser reaches only bundled fictional pages; it cannot load a real URL. |
| Digital purchases | **Yes.** One-time, non-consumable case and season purchases. |
| Advertising | **None of any kind.** |
| Data collection | **None.** |

Expected outcomes on those answers: **App Store 9+** (infrequent/mild mature
themes from the crime subject) and **IARC Everyone 10+** or lower. Confirm
whatever the questionnaires return rather than assuming these.

Also set, on both stores: **contains in-app purchases = yes**, **contains ads =
no**, **target audience is not children** (the game is not directed at under-13s
and must not be enrolled in Play's Families programme).

---

## 6. What still needs a human

- [ ] `npx eas init` — creates the EAS project, writes `owner` and the project id
- [ ] Apple Developer Program membership, App ID, and an App Store Connect record
- [ ] Google Play Console developer account and an app record
- [ ] Replace every `PLACEHOLDER_*` in `eas.json` and in this document
- [ ] Host the privacy policy and support page; paste the real URLs
- [ ] Capture screenshots and produce the 1024 × 500 feature graphic
- [ ] Complete both age-rating questionnaires
- [ ] Complete the App Store privacy questionnaire and the Play Data Safety form
      using `docs/PRIVACY.md`
