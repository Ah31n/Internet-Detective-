# CASE 001 — THE MISSING DIAMOND

## Status

CASE 001 is the first registered, fully playable production case. It is authored as structured TypeScript content and runs through the same deterministic engine as the verification fixture.

The player investigates the substitution of the forty-two-carat Asterion Diamond during Hartwell Museum’s Midnight Gallery gala. The public display seal remains intact, six suspects present overlapping motives and alibis, and independent physical and digital records must be reconciled.

## Content inventory

- 6 structured suspects with roles, summaries, tags, and stated alibis
- 10 structured locations and investigation scenes
- 48 stable evidence items
- 25 conditionally revealed timeline events
- 6 authored suspect relationships
- 5 message threads
- 7 emails
- 6 fictional websites with distinct native visual identities
- 4 CCTV sources with local poster stills, markers, and transcripts
- 8 documents
- 5 receipts or transaction records
- 7 evidence photographs
- 7 required deductions
- statements from all 6 suspects
- physical evidence, digital evidence, red herrings, conflicting accounts, timestamps, and corroborated alibis

All websites use local `.invalid` hosts and structured native blocks. Eleven evidence images are bundled locally. CCTV remains playable without a remote video dependency through local archived stills, deterministic markers, and transcripts.

## Authoring order

The case was produced in three explicit layers:

1. `case001.solution.ts` defines the sealed canonical explanation, ordered event sequence, exact deduction evidence sets, accusation answers, and post-resolution copy.
2. `case001.dependencies.ts` defines the spoiler-sealed dependency stages that connect discoverable evidence to deductions, location unlocks, recovery, and the final accusation.
3. The remaining files implement player-visible intelligence, evidence, fictional websites, scenes, deductions, and accusation options.

The canonical solution and dependency graph are authoring/runtime inputs only. They are not passed through the investigation view model.

## Logical solvability

The solution does not depend on one confession or one ambiguous clue. Each required conclusion combines independently authored records:

- camera integrity and source footage;
- credential alerts, immutable administration logs, and an independent alibi record;
- replica characteristics, vendor transaction, and dispatch correspondence;
- corridor footage and two physical traces;
- private communications, buyer correspondence, and payment movement;
- equipment inventory, key custody, and locker service records;
- a personal financial demand that also eliminates the institutional and inheritance motives.

Progression prevents late conclusions from appearing before their prerequisite evidence. A deterministic integration test begins the case, visits available locations, uses all six local websites, solves each dependency in order, reaches the recovery scene, and completes the accusation with a perfect score. A second suite (`case001.logic.test.ts`) enforces timeline consistency, camera-window arithmetic, suspect exclusivity, discoverability, gating, and rejection of the strongest alternative theory. See [`CASE_001_QA.md`](CASE_001_QA.md).

## Spoiler boundary

Before resolution, the React Native UI receives only authored visible content, discovered evidence, known relationships, verified timeline events, available deductions, and accusation options. It does not receive canonical answers or required evidence sets.

Correct resolution copy is exposed only after the deterministic engine confirms every required deduction and exact accusation answer.

## Source layout

```text
src/case-content/cases/case001/
├── case001.solution.ts       Sealed canonical solution
├── case001.dependencies.ts   Evidence dependency graph
├── case001.intelligence.ts   Suspects, locations, relationships, timeline
├── case001.evidence.ts       48 structured evidence objects
├── case001.internet.ts       Six entirely local fictional sites
├── case001.definition.ts     Scenes, deductions, accusation, case assembly
├── case001.test.ts           Inventory, validation, dependency, playthrough tests
└── case001.logic.test.ts     Logic validation: consistency, exclusivity, gating
```
