# INTERNET DETECTIVE — Mobile Shell Architecture

## Scope

This foundation implements the installed mobile game shell, deterministic case engine, reusable evidence inspection, touch Evidence Board, local fictional-internet architecture, and the first registered production investigation: CASE 001 — THE MISSING DIAMOND. A separate test-only verification definition continues to exercise isolated runtime behavior.

The build targets iOS and Android only. There is no web platform, responsive browser interface, dashboard, landing page, PWA layer, or WebView-backed game surface.

## Native route map

```text
/                           Animated app launch and route restoration
/investigation-home         Primary field desk
/case-library               Local case archive shell
/case-brief                 Case briefing room shell
/investigation              Investigation Hub tab
/investigation/evidence     Evidence tab
/investigation/leads        Leads tab
/investigation/notebook     Notebook tab
/investigation/internet     Case Net local index tab
/internet/[siteId]/[pageId] Full-screen native fictional page viewer
/board                      Full-screen touch Evidence Board
/evidence/[evidenceId]      Full-screen native evidence inspector
/settings                   Native modal settings
```

Expo Router owns both stack navigation and investigation tabs. Route files under `src/app` remain thin and import feature screens from outside the routing directory.

## Navigation hierarchy

```text
Root native stack
├── App Launch
├── Shell stack
│   ├── Investigation Home
│   ├── Case Library
│   └── Case Brief
├── Investigation tab navigator
│   ├── Hub
│   ├── Evidence
│   ├── Leads
│   ├── Notebook
│   └── Case Net local index
├── Full-screen evidence inspector
├── Full-screen touch Evidence Board
├── Full-screen fictional-page viewer
└── Settings modal
```

The bottom navigator exists only inside the investigation room. It is not a website-style global navbar.

## Persistent navigation state

`src/state/app.store.ts` persists:

- the last meaningful shell route;
- the last selected investigation tab;
- haptic, sound, and reduced-motion settings.

The launch screen waits for AsyncStorage hydration, performs the brand transition, then restores the last route. Settings is intentionally excluded from restoration so the app never cold-launches into a modal.

The storage key is `internet-detective.app-shell`. Any future persisted-shape change must add a migration before incrementing the store version.

## Safe areas

`SafeAreaProvider` is mounted at the application root. Every feature screen renders through the shared `Screen` primitive:

- stack screens consume top, bottom, left, and right safe areas;
- investigation screens consume top and horizontal areas while the native tab navigator manages the bottom inset;
- settings and launch surfaces handle their own full-screen requirements.

## Tactile transitions

- Stack routes use native slide transitions.
- Settings uses a native modal transition.
- Investigation tabs use a fade transition and haptic selection feedback.
- Buttons and navigation rows use Reanimated spring compression.
- The launch identity uses Reanimated timing and restores the persisted destination afterward.
- Reduced-motion settings remove custom motion and native stack/tab animations where supported.

Haptics are isolated behind `core/feedback/haptics.ts` and obey the persisted player setting.

## Visual system

The shell uses the INTERNET DETECTIVE field-desk language:

- ink-black operational surfaces;
- brass identity and navigation accents;
- rust classification marks;
- paper dossier material for the briefing room;
- registration marks, ledger rules, archive indexes, and instrument crosshairs;
- serif editorial titles paired with compact monospaced system labels.

Generic card grids are intentionally avoided. Navigation is expressed as a ruled registry, the library as an indexed archive, the brief as a physical dossier, and investigation sections as full-screen instruments.

## Feature boundaries

```text
routes → feature screens → app state / core adapters
                     ↘ design system
```

- `app/` contains route composition only.
- `features/shell/` owns launch, home, library, and brief presentation.
- `features/investigation/` owns the core investigation tool surfaces.
- `features/evidence/` owns full-screen native evidence inspection.
- `features/evidence-board/` owns native-thread wall gestures, physical artifacts, live strings, and touch tool modes.
- `features/internet/` owns the local Case Net index, fixed tool chrome, and typed site renderer.
- `features/settings/` owns settings presentation.
- `state/` owns durable shell state and separate persisted case sessions.
- `core/` owns native/platform adapters.
- `design-system/` contains reusable native primitives and tokens.

Production case content lives in `src/case-content/cases/` and reaches the shell only through the validated registry. CASE 001 follows this boundary without placing authored facts in routes, feature components, or shell state.

## Deterministic case engine boundary

The reusable case engine now lives in `src/case-engine`. Structured `CaseDefinition` data is immutable authored content; persisted `CasePlayerState` is stored independently in `case-session.store.ts`. Closed condition and transition unions determine unlocks, deductions, accusations, and scoring without AI or free-text inference.

The investigation screens consume a generic, truth-redacted view model. The Case Library consumes the validated case registry. No screen imports Case 001 constants or embeds canonical answers.

See [`CASE_ENGINE.md`](CASE_ENGINE.md) for the schema, transition guarantees, validation, rendering boundary, and authoring workflow. The reusable evidence state, full-screen route, connection model, media registry, and eight native viewers are documented in [`EVIDENCE_SYSTEM.md`](EVIDENCE_SYSTEM.md). The touch wall, gesture arbitration, physical motion, live relations, and persistent layout are documented in [`EVIDENCE_BOARD.md`](EVIDENCE_BOARD.md). The structured offline sites, native renderer, deterministic browser state, and no-network boundary are documented in [`FICTIONAL_INTERNET.md`](FICTIONAL_INTERNET.md). CASE 001’s spoiler-safe inventory, authoring order, and solvability guarantees are documented in [`CASE_001.md`](CASE_001.md).

## Production content boundary

CASE 001 is assembled from sealed solution, dependency, intelligence, evidence, and fictional-internet modules before registration. Future cases must preserve the same order and must not put case content into route files, React components, or the app-shell store. See [`CASE_001.md`](CASE_001.md).
