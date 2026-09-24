# Deterministic Case Engine

## Purpose

The case engine is a reusable, pure TypeScript runtime that turns an immutable `CaseDefinition` plus a separate `CasePlayerState` into deterministic transitions and a truth-redacted investigation view model.

It does not call an AI service, use randomness, read the clock, depend on React Native, or infer authored truth.

## Core equation

```text
CaseDefinition + CasePlayerState + CaseAction
                    ↓
             transitionCase(...)
                    ↓
CasePlayerState' + deterministic EngineEvent[]
```

For the same validated definition, starting state, and ordered actions, the engine produces structurally identical state and events.

## Source layout

```text
src/case-engine/
├── domain/
│   ├── case-definition.ts   Immutable authored content and canonical truth
│   ├── player-state.ts      Serializable player progress only
│   ├── case-action.ts       Closed action, event, and error unions
│   ├── evidence-board.ts    Persistent wall placements and collections
│   ├── fictional-internet.ts Structured local site/page contracts
│   └── view-model.ts        Truth-redacted renderer contract
├── engine/
│   ├── conditions.ts        Deterministic unlock predicates
│   ├── validation.ts        Runtime schema/reference validation
│   ├── transition.ts        Pure transition and scoring rules
│   ├── evidence-board.ts    Stable wall layout helpers and bounds
│   ├── fictional-internet.ts Local page lookup and in-memory search
│   └── selectors.ts         Definition + state → renderable view model
├── testing/
│   └── verificationCase.ts  Test-only structured fixture
└── __tests__/
    └── case-engine.test.ts
```

The public API is exported from `src/case-engine/index.ts`.

## Definition versus player state

### `CaseDefinition`

A definition owns authored, immutable material:

- metadata and brief;
- objectives;
- suspects, locations, conditionally known relationships, and sourced timeline events;
- scenes and scene unlock conditions;
- evidence and local fictional-internet content;
- deductions and selection bounds;
- accusation questions and visible options;
- canonical deduction evidence sets;
- canonical accusation answers;
- deterministic scoring values;
- resolution copy.

Definitions are TypeScript data. Production definitions are registered in `src/case-content/caseRegistry.ts` and validated when the registry loads.

### `CasePlayerState`

Player state owns only progress:

- current phase and deterministic turn counter;
- current and visited scenes;
- discovered, viewed, and referenced evidence IDs;
- persisted evidence connections and theory-used evidence IDs;
- Evidence Board placements, viewport, groups, and theory clusters;
- Case Net location, visit history/index, visited page keys, and bookmarks;
- solved deduction IDs and attempts;
- submitted accusation attempts;
- deterministic resolution and score.

It contains the case ID and content version for compatibility checks, but it never stores the authored canonical truth.

Player sessions are persisted separately in `src/state/case-session.store.ts` under `internet-detective.case-sessions`. Definitions are not serialized into save data.

## Canonical truth

Truth is declared under `CaseDefinition.canonicalTruth`:

```ts
canonicalTruth: {
  deductionSolutions: {
    'deduction-id': {
      requiredEvidenceIds: ['evidence-a', 'evidence-b'],
    },
  },
  accusationAnswers: {
    'question-id': 'authored-option-id',
  },
  requiredDeductionIds: ['deduction-id'],
  resolution: {
    headline: '...',
    summary: '...',
  },
}
```

The transition engine compares IDs and exact evidence sets. It does not classify free text or ask an AI whether the player is correct.

The React Native layer consumes `InvestigationViewModel`, not raw truth. Canonical solution data is omitted before resolution; only approved resolution copy and score become renderable after deterministic success.

## Conditions

Unlock rules use a closed recursive union:

- `all`
- `any`
- `not`
- `sceneVisited`
- `evidenceDiscovered`
- `evidenceViewed`
- `evidenceReferenced`
- `deductionSolved`

No arbitrary JavaScript callback is stored in a definition. This keeps content serializable, inspectable, testable, and deterministic.

## Actions

The engine currently accepts:

- `BEGIN_INVESTIGATION`
- `VISIT_SCENE`
- `VIEW_EVIDENCE`
- `SET_EVIDENCE_REFERENCED`
- `CONNECT_EVIDENCE`
- `DISCONNECT_EVIDENCE`
- `PLACE_DISCOVERED_EVIDENCE_ON_BOARD`
- `MOVE_EVIDENCE_ON_BOARD`
- `SET_EVIDENCE_BOARD_VIEWPORT`
- `CREATE_EVIDENCE_BOARD_GROUP`
- `DELETE_EVIDENCE_BOARD_GROUP`
- `CREATE_THEORY_CLUSTER`
- `DELETE_THEORY_CLUSTER`
- `OPEN_INTERNET_PAGE`
- `INTERNET_BACK`
- `INTERNET_FORWARD`
- `SET_INTERNET_PAGE_BOOKMARKED`
- `SUBMIT_DEDUCTION`
- `SUBMIT_ACCUSATION`

Invalid actions return a typed failure and the exact original state reference. Successful actions return new immutable state plus deterministic domain events. Events contain turn numbers, never timestamps.

## Runtime validation

`validateCaseDefinition` checks authored IDs, references, conditions, truth mappings, selection ranges, scoring values, content versions, and the complete fictional-internet graph. Case Net checks include reserved `.invalid` hosts, distinct visual identities, local link targets, bundled image references, and page-authored evidence references. `createInitialCasePlayerState` refuses invalid definitions.

Validation prevents a missing evidence ID or truth answer from becoming a runtime mystery during play.

## Rendering

`CaseInvestigationRenderer` is generic and receives a `CaseDefinition`. It builds a truth-redacted view model and renders the current investigation section:

- Hub: brief, current scene, available scene transitions, suspect profiles, and stated alibis
- Evidence: discovered, viewed, referenced, connected, and theory-used evidence
- Leads: conditionally known relationships, the touch Evidence Board, and deterministic evidence-set deductions
- Notebook: objectives, sourced verified timeline events, and authored accusation options

The Case Library reads `CASE_DEFINITIONS`. The Case Brief reads the active definition. Screen components contain no Case 001 constants.

The Case Net native index and renderer consume the same definition/state boundary; local page visits can reveal authored evidence but cannot evaluate or invent truth. See [`FICTIONAL_INTERNET.md`](FICTIONAL_INTERNET.md).

The production registry contains CASE 001 — THE MISSING DIAMOND. Its sealed canonical solution, dependency graph, 46 evidence objects, intelligence data, and six local sites are documented in [`CASE_001.md`](CASE_001.md). The separate verification fixture remains test-only.

## Content authoring workflow

1. Write the complete canonical solution and ordered incident sequence before player-visible content.
2. Define an evidence-dependency graph proving every required conclusion without circular unlocks.
3. Author suspects, locations, relationships, timeline, scenes, evidence, and local sites against that graph.
4. Assemble a TypeScript object with `as const satisfies CaseDefinition` and a positive `contentVersion`.
5. Add an automated deterministic playthrough that reaches the solution only through authored dependencies.
6. Run `validateCaseDefinition` and the full engine suite.
7. Register the definition in `caseRegistry.ts`.
8. Add content migration logic before changing a released definition in a save-incompatible way.

## Guarantees and non-goals

Guaranteed:

- deterministic truth evaluation;
- definition/state separation;
- immutable transition behavior;
- runtime reference validation;
- serializable progress;
- renderer truth redaction;
- no AI truth authority.

Not yet implemented:

- content download/signature infrastructure;
- released-save migrations;
- localization bundles;
- narrative presentation polish;
- audio or cinematic orchestration.
