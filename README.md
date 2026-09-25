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
quarantined and recovered from a rolling backup instead of being erased.

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

## Progression, motion, audio, and accessibility

Offline deterministic progression with seven detective ranks and ten
commendations; a documented motion system with a reduced-motion contract; a
four-layer audio mix that suspends with the app; and an accessibility pass
covering contrast, dynamic type, touch targets, screen-reader naming, and the
rule that colour never carries meaning alone.

See [`docs/MOTION.md`](docs/MOTION.md), [`docs/AUDIO.md`](docs/AUDIO.md), and
[`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md).

## Entitlements, the anthology, and purchase architecture

An abstract entitlement model (`case:001`, `season:01`, `complete:edition`)
with a data-driven containment graph. Screens ask one question,
`canAccessCase`, and never inspect a purchase state — enforced by a source
audit. The store is a published anthology rather than a pricing page. Billing
is architecture only: a deterministic mock adapter in development and an
honestly unwired platform adapter in release. Case 001 is bundled, free, and
permanent.

See [`docs/COMMERCE.md`](docs/COMMERCE.md).

## Performance, developer tools, and distribution

A production performance pass on render discipline, image budgets, memory, and
the evidence board's per-frame cost, with budgets enforced by test. A
developer-only QA console that is excluded from release bundles at the bundler,
not merely hidden — verified by grepping a compiled production build. And a
full store-readiness pass: permissions cut from nine to three, no iOS usage
descriptions, an offline guarantee asserted by test, and complete listing and
privacy material.

See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md),
[`docs/DEVELOPER_TOOLS.md`](docs/DEVELOPER_TOOLS.md),
[`docs/STORE_READINESS.md`](docs/STORE_READINESS.md),
[`docs/STORE_LISTING.md`](docs/STORE_LISTING.md),
[`docs/PRIVACY.md`](docs/PRIVACY.md), and
[`docs/PLAYER_AUDIT.md`](docs/PLAYER_AUDIT.md).

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

# Exports a real production bundle and fails if the canonical solution or the
# developer tools are present in the compiled output.
npm run verify:release
```

## Store builds

Before the first store build, run `npx eas init`, then replace every
`PLACEHOLDER_*` value in `eas.json` and `docs/STORE_LISTING.md` with values
from your own Apple and Google developer accounts. Identifiers live in
`app.config.ts`. No credentials are committed to this repository.

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
  core/                 Bootstrap, audio, haptics, progression, and service boundaries
    commerce/            Entitlements, catalog, case access, purchase adapters
    dev/                 Developer QA tools, excluded from release bundles
  design-system/        Native controls and visual tokens
  features/
    shell/               Launch and top-level shell screens
    investigation/       Engine-backed investigation surfaces
    evidence/            Full-screen inspector and eight viewers
    evidence-board/      Touch wall, physical artifacts, strings, and tools
    internet/            Case Net index, browser chrome, and site renderer
    profile/             The typeset detective record
    store/               The anthology
    settings/            Native settings screen
    qa/                  Developer QA console (development builds only)
  navigation/           Route restoration hook
  state/                Shell, case-session, profile, and entitlement stores
                        plus the autosave transport
plugins/                Local Expo config plugin for release hygiene
tools/                  Asset pipeline, audio generation, release verification
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture.
