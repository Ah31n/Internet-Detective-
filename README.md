# INTERNET DETECTIVE

A native mobile detective game foundation for **iOS and Android**, built with React Native and Expo.

This repository intentionally has no web target, responsive website, PWA layer, HTML/CSS interface, or browser navigation. Expo is configured only for `ios` and `android`.

## Implemented scope

- Animated app launch and persistent route restoration
- Investigation Home, Case Library, Case Brief, Investigation Hub, bottom tabs, and Settings
- Reusable deterministic Case Engine
- Structured TypeScript case definitions and runtime validation
- Separate persisted player-session state
- Reusable persistent evidence system
- Full-screen native evidence inspection
- Photo, document, receipt, message, email, CCTV, webpage, and statement viewers
- Case Net: an entirely local fictional internet with structured native pages
- Deterministic local search, visits, history, bookmarks, links, and clue discovery
- Per-site authored visual identities and bundled-only image resolution
- Full-screen touch Evidence Board with physical artifacts and live strings
- One-finger artifact drag, two-finger wall pan, pinch zoom, and long-press tools
- Persistent positions, groups, contradiction links, and theory clusters
- Debounced offline autosave, relaunch restore, save recovery, and developer reset tools
- Touch-first interaction pass: 44 pt targets, native sheets, restrained haptics, safe areas

The production registry includes the first complete playable investigation: **CASE 001 — THE MISSING DIAMOND**.

## CASE 001

The Asterion Diamond has been replaced during a sealed museum gala. The case contains six suspects, ten locations, 48 evidence items, 25 timeline events, seven gated deductions, six local fictional websites, four CCTV sources, layered red herrings, and a fully deterministic evidence path. Canonical answers remain sealed from the UI until a correct resolution.

See [`docs/CASE_001.md`](docs/CASE_001.md).

## Deterministic Case Engine

`src/case-engine` consumes immutable `CaseDefinition` data and separate `CasePlayerState`. Closed actions and conditions determine discovery, unlocks, deductions, accusations, and scoring. AI is not used to determine truth.

See [`docs/CASE_ENGINE.md`](docs/CASE_ENGINE.md).

## Evidence system

Evidence has stable authored IDs and persisted discovered, viewed, referenced, connected, and theory-use state. The native full-screen route dispatches deterministic actions and selects a type-specific viewer rather than presenting a generic file manager.

See [`docs/EVIDENCE_SYSTEM.md`](docs/EVIDENCE_SYSTEM.md).

## Touch Evidence Board

The dedicated full-screen wall uses Gesture Handler and Reanimated for native-thread, touch-first manipulation. Artifacts lift, rotate subtly, follow the finger at every zoom level, and settle with spring physics. Physical strings, contradiction marks, hand-grouped regions, and speculative theory clusters follow live positions; settled layout and viewport state persist through deterministic engine actions.

See [`docs/EVIDENCE_BOARD.md`](docs/EVIDENCE_BOARD.md).

## Local fictional internet

Case Net renders typed case-authored sites with native React Native components. It has no WebView, arbitrary HTML, editable URL navigation, remote search, or network fallback. `.invalid` hosts, structured local links, visits, history, bookmarks, and page-authored evidence discovery remain inside the deterministic case engine.

See [`docs/FICTIONAL_INTERNET.md`](docs/FICTIONAL_INTERNET.md).

## Persistent investigation state

Player state is local-only and survives backgrounding, termination, and
relaunch: current case, completed cases, settings, achievements, detective
level, and the full per-case record of evidence, notes, board layout,
connections, timeline pins, theories, hints, duration, and the last opened
screen and evidence. Writes are debounced and coalesced, damaged saves are
quarantined and recovered from a rolling backup instead of being erased, and a
`__DEV__`-only tools panel can reset the case, clear the save, unlock evidence,
complete the case, or reset the board.

See [`docs/PERSISTENCE.md`](docs/PERSISTENCE.md).

## Mobile-first interaction

Every control follows TOUCH → GESTURE → STATE → MOTION → FEEDBACK. Targets are
at least 44 pt with default hit slop, sheets are draggable, interruptible and
dismissible rather than web modals, evidence media pinches and double-taps to
detail, board artifacts lift, tilt and settle with real momentum, and one
restrained haptic plus at most one short banner acknowledges each meaningful
event. Nothing sits under the Dynamic Island, the home indicator, or Android
gesture navigation, and returning from a detour restores the investigation
context instead of resetting it.

See [`docs/INTERACTION.md`](docs/INTERACTION.md).

## Foundation

- Expo SDK 57 / React Native 0.86
- TypeScript in strict mode
- Expo Router with typed routes
- Zustand and AsyncStorage persistence
- React Native Gesture Handler and Reanimated
- Expo Image and Expo Video
- Haptic navigation feedback
- Safe-area-aware native screens
- Vitest deterministic engine tests
- EAS development, preview, simulator, and production profiles

## Run locally

```bash
npm install
npm run ios
# or
npm run android
```

For release-like native-module testing, use a development build:

```bash
npx eas-cli@latest build --platform ios --profile development
npx eas-cli@latest build --platform android --profile development
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run doctor
```

## Store builds

Before the first store build, connect the repository to an Expo account and confirm ownership of the identifiers in `app.json`.

```bash
npm run build:ios
npm run build:android
```

## Project map

```text
src/
  app/                  Expo Router composition, evidence, and Case Net routes
  case-engine/          Pure deterministic case/evidence/internet domain runtime
  case-content/         Validated registry and bundled native media registries
  core/                 Bootstrap, haptics, and service boundaries
  design-system/        Native controls and visual tokens
  features/
    shell/               Launch and top-level shell screens
    investigation/       Engine-backed investigation surfaces
    evidence/            Full-screen inspector and eight viewers
    evidence-board/      Touch wall, physical artifacts, strings, and tools
    internet/            Case Net index, browser chrome, and site renderer
    settings/            Native settings screen
  navigation/           Route restoration hook
  state/                Shell, case-session, and profile stores plus the autosave transport
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture.
