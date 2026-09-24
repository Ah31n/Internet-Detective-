# Reusable Evidence System

## Scope

Evidence is a first-class deterministic mobile-game system layered on the Case Engine. It is not a file manager and does not infer facts from media.

Every evidence definition has a stable, authored `EvidenceId`. Player interaction state stores IDs and relationships separately from immutable evidence content.

## Supported evidence definitions

`EvidenceDefinition` is a discriminated TypeScript union with eight variants:

- `photo`
- `document`
- `receipt`
- `message`
- `email`
- `cctv`
- `webpage`
- `statement`

Each variant owns structured fields appropriate to its medium. For example, receipts contain line items and totals, message evidence contains participants and stable message entries, and CCTV contains a video reference and timestamped markers.

Evidence media uses a stable `assetId` plus optional remote `uri`. Native `require(...)` values are kept in `case-content/evidenceMediaRegistry.ts`, outside serializable case data.

## Stable identity and validation

`validateCaseDefinition` enforces:

- unique, non-empty evidence IDs;
- stable nested IDs for pages, blocks, receipt lines, messages, annotations, and CCTV markers;
- valid message participant references;
- valid email attachment evidence references;
- valid media asset IDs, accessibility labels, and dimensions;
- valid annotation coordinates and CCTV marker offsets;
- valid scene, condition, and canonical-truth evidence references.

The test fixture contains all eight evidence variants but is not registered as playable content.

## Player evidence state

The persisted `CasePlayerState` owns:

```ts
discoveredEvidenceIds
viewedEvidenceIds
referencedEvidenceIds
evidenceConnections
theoryEvidenceIds
evidenceBoard
```

Definitions remain immutable. Session state is persisted by Zustand/AsyncStorage under `internet-detective.case-sessions`.

The store schema is version 4. Migrations preserve earlier viewed/reference/connection and Case Net progress while initializing the persistent Evidence Board for pre-board sessions.

## Deterministic evidence actions

The Case Engine accepts:

- `VIEW_EVIDENCE`
- `SET_EVIDENCE_REFERENCED`
- `CONNECT_EVIDENCE`
- `DISCONNECT_EVIDENCE`
- `SUBMIT_DEDUCTION`

Discovery remains authored by scene transitions. Evidence can only be viewed, referenced, connected, or used in a deduction after discovery.

Connection IDs are deterministically derived from the source evidence ID, relationship kind, and target evidence ID. Supported relationships are:

- `related`
- `supports`
- `contradicts`
- `sequence`

Submitting a deduction persists its selected evidence IDs in deduction attempts and adds them to `theoryEvidenceIds`, regardless of whether the theory was correct.

No AI decides whether evidence supports a theory. Exact canonical evidence sets continue to determine deduction truth.

## Touch Evidence Board

The full-screen `/board` route turns discovered evidence and deterministic connections into a physical, touch-first wall with persistent positions, zoomed viewport, groups, contradiction strings, and speculative theory clusters. It does not replace canonical deduction evaluation. See [`EVIDENCE_BOARD.md`](EVIDENCE_BOARD.md) for gesture arbitration, spring behavior, rendering, and board-state actions.

## Full-screen inspection

The native route `/evidence/[evidenceId]` opens a safe-area-aware full-screen modal. It:

- verifies the active case and discovery state;
- records the first view deterministically;
- displays the stable evidence ID and source;
- supports reference/bookmark state;
- displays theory-use status;
- creates and removes persisted evidence connections;
- opens linked email attachments only when discovered;
- renders the appropriate type-specific viewer.

## Viewer behavior

### Photo

Full-screen image surface with native image caching, pinch/pan gestures, double-tap zoom, captions, and authored annotation markers.

### Document

Horizontally paged paper documents with structured headings, paragraphs, quotations, redactions, authorship, page labels, and stable page IDs.

### Receipt

Purpose-built receipt paper with merchant metadata, line items, totals, payment references, and a visual barcode treatment.

### Message

Native conversation presentation using authored participants, timestamps, delivery state, and incoming/outgoing message alignment.

### Email

Mail header fields, structured body blocks, and linked evidence attachments. It renders a captured message rather than embedding a browser.

### CCTV

Native `expo-video` playback, camera/time overlays, custom playback control, deterministic timeline markers, and optional transcript blocks.

### Webpage

A native offline-capture presentation with URL chrome, capture time, article metadata, optional hero media, and structured body blocks. It does not render arbitrary HTML or use a WebView.

### Statement

A signed transcript treatment with speaker identity, role, recording context, structured quotations/redactions, and signature metadata.

## Rendering boundary

The investigation evidence index receives truth-redacted `EvidenceViewModel` objects. It shows discovered items and state indicators, then routes to full-screen inspection.

Screen components never hardcode Case 001 evidence. Adding evidence means authoring structured `CaseDefinition` data and registering media asset IDs.
