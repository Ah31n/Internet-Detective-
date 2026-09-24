# AUDIO — Phase 13

A restrained audio system for INTERNET DETECTIVE. No case logic changed, no
screen redesigned.

The soundscape is sophisticated and quiet: room tone you stop noticing, paper
and wood for the interface, equipment for the investigation, and exactly one
scored cue in the whole game — the one that closes a case.

---

## 1. Layers

| Layer | Mixed by | Contents |
| --- | --- | --- |
| `ambient` | Ambience volume | hotel room, distant city, rain, electronic hum, surveillance room |
| `ui` | Effects volume | tap, paper, drawer, evidence placement, notification, document opening |
| `investigation` | Effects volume | camera shutter, CCTV activation, timeline confirmation, contradiction |
| `completion` | Music volume | `CASE CLOSED` |

Every cue the game can make is declared once in
`src/core/audio/audioCatalog.ts` with its layer, trim, cooldown, duration, and
a one-line note on when it is allowed to be heard. Nothing plays that is not in
that table.

### Assets

The palette is synthesised offline by `tools/generate_audio.py` (numpy →
mono 22.05 kHz 16-bit WAV) into `assets/audio/`. 16 cues, **1.47 MB total** —
ambient beds are 5.4 s and crossfade-looped so they have no seam; one-shots run
55 ms – 2.6 s. Nothing is streamed, nothing needs a network, and the palette is
deterministic and licence-free. Re-run the script to regenerate or retune it.

---

## 2. Where sound is attached

| Moment | Cue |
| --- | --- |
| Shell screens (home, library, brief) | bed: `ambient-hotel-room` |
| Investigation sections | bed: `ambient-distant-city` |
| Evidence board | bed: `ambient-rain` |
| Offline browser | bed: `ambient-electronic-hum` |
| CCTV inspection | bed: `ambient-surveillance-room` |
| Any tactile press | `ui-tap` (trimmed to 0.5, 90 ms cooldown) |
| Bottom sheet opening | `ui-drawer` |
| Evidence recovered | `ui-document-open` |
| Artifact settling on the board | `ui-evidence-place` |
| Message or email opened | `ui-paper` |
| Document, receipt, statement opened | `ui-paper` |
| Photograph inspected | `investigation-camera-shutter` |
| Surveillance record opened | `investigation-cctv-activate` |
| Deduction proven / timeline confirmed | `investigation-timeline-confirm` |
| Contradiction marked | `investigation-contradiction` |
| Case closed | `completion-case-closed` |

Beds are **requested**, not set: `useAmbientBed` pushes a request while a screen
is mounted and gives back only its own on unmount, so an overlapping navigation
can never leave the game silent or stack two beds.

Engine transitions carry their sound in the same pure vocabulary as their
haptic — `FeedbackEvent.sound` in `src/core/feedback/transitionFeedback.ts` —
so a transition produces **one haptic, one cue, and at most one banner**.

---

## 3. Settings

`Settings → AUDIO`, persisted in `internet-detective.app-shell` (store v2):

- **Mute all audio** — absolute; beats every other setting.
- **Music** — scored cues.
- **Effects** — interface and investigation.
- **Ambience** — beds.

Volumes are stepped (0 / 25 / 50 / 75 / 100) rather than continuous: a stepped
control is a real touch target, and each change previews itself with a cue from
the layer being adjusted. Defaults are deliberately low —
music 0.6, effects 0.7, ambience 0.45.

**Migration:** v1 shells stored a single `soundEnabled` switch. A player who had
turned sound off is migrated to `masterMuted: true`; everyone else gets the
default mix.

---

## 4. Haptics

Unchanged from Phase 11 and still governed by `settings.hapticsEnabled`:
evidence collected (medium), connection (medium), contradiction (warning),
confirmation (success), completion (success + one soft echo). Incidental
haptics are throttled at 55 ms; significant ones always play.

Haptics are never required to understand the game: every haptic moment also has
a visible state change, and most have a banner.

---

## 5. Failure

Missing or broken audio can never take the game down.

- The native module is resolved lazily inside `safely()`. If `expo-audio` is
  absent, the engine reports `moduleAvailable: false` and the game runs silent.
- `resolveAudioSource` returns `null` instead of throwing for an asset that is
  not in the build.
- Any cue that fails to resolve, create, or play once is added to an
  `unavailable` set and is never attempted again.
- Every native call — create, play, seek, volume, pause, release — is wrapped;
  failures warn in development only.

---

## 6. Performance

- **Nothing is preloaded.** A player is created the first time a cue is
  actually audible.
- **Inaudible cues are never loaded at all** — a muted master or a zero layer
  volume short-circuits before any decoder is opened, and an ambient bed turned
  to zero is released.
- **The one-shot cache is capped** at 5 players, least-recently-used released.
- **Cooldowns per cue** (`audioScheduler`) stop taps, drags, and transition
  bursts from chattering.
- **A voice ceiling of 3** one-shots (4 for a payoff cue) prevents pile-ups.
- **One bed at a time**, released on background; `AppState` suspends the whole
  soundscape when the app leaves the foreground.
- The session mixes with other apps and honours the hardware silent switch.

---

## 7. Verification

`npm run typecheck` · `npm run lint` (0 warnings) ·
`npx vitest run` — **91 tests / 9 files**, including
`audioMixer`, `audioScheduler`, `audioCatalog`, and the extended
`transitionFeedback` sound vocabulary ·
`npx expo-doctor` 21/21 · `npx expo export` for iOS and Android.
