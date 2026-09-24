import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CASE_001 } from '@/case-content/cases/case001/case001.definition';
import { createInitialCasePlayerState, type CasePlayerState } from '@/case-engine';

import { CASE001_EVIDENCE_DEPENDENCIES } from '@/case-content/cases/case001/case001.dependencies';
import { CASE001_SOLUTION_RECORD } from '@/case-content/cases/case001/case001.solution';

import { loadCanonicalReveal, loadDependencyGraph } from '../canonicalReveal';
import {
  inspectCaseState,
  inspectConnectionState,
  inspectEntitlementState,
  inspectEvidenceIds,
  inspectPlayerState,
  inspectTheoryState,
  inspectTimelineState,
} from '../qaInspectors';
import { resetMemoryStorage } from '../../../state/persistence/testing/memoryAsyncStorage';

/**
 * PHASE 17 — the QA system's behaviour.
 *
 * The tool registry itself imports `expo-router`, which cannot be loaded in a
 * node test environment, so the store mutations the tools perform are driven
 * here directly through the same store actions the tools call. The tools are
 * thin wrappers over exactly these calls, and the source audit in
 * `devMode.test.ts` holds that shape in place.
 */

const CASE_ID = CASE_001.id;

async function freshStore() {
  vi.resetModules();
  resetMemoryStorage();
  const module = await import('../../../state/case-session.store');
  await module.useCaseSessionStore.persist.rehydrate();
  return module.useCaseSessionStore;
}

describe('QA store actions', () => {
  beforeEach(() => {
    resetMemoryStorage();
  });

  it('adds every artifact without visiting a scene or marking it read', async () => {
    const store = await freshStore();
    store.getState().activateCase(CASE_001);
    store.getState().devAddAllEvidence(CASE_001);

    const session = store.getState().sessions[CASE_ID]!;
    expect(session.discoveredEvidenceIds).toHaveLength(
      CASE_001.investigation.evidence.length,
    );
    // The distinction from "unlock all" is the point of having both.
    expect(session.viewedEvidenceIds).toHaveLength(0);
    expect(session.visitedSceneIds).toHaveLength(0);
  });

  it('unlocks everything: scenes entered, artifacts found and read', async () => {
    const store = await freshStore();
    store.getState().activateCase(CASE_001);
    store.getState().devUnlockAllEvidence(CASE_001);

    const session = store.getState().sessions[CASE_ID]!;
    expect(session.visitedSceneIds).toHaveLength(
      CASE_001.investigation.scenes.length,
    );
    expect(session.viewedEvidenceIds).toHaveLength(
      CASE_001.investigation.evidence.length,
    );
  });

  it('completes the case at full score with the canonical deductions solved', async () => {
    const store = await freshStore();
    store.getState().activateCase(CASE_001);
    store.getState().devCompleteCase(CASE_001);

    const session = store.getState().sessions[CASE_ID]!;
    expect(session.resolution?.correct).toBe(true);
    expect(session.resolution?.score).toBe(CASE_001.scoring.maximumScore);
    expect(session.solvedDeductionIds).toEqual(
      CASE_001.canonicalTruth.requiredDeductionIds,
    );
    expect(store.getState().progress[CASE_ID]?.completed).toBe(true);
  });

  it('builds test strings and contradictions through the engine, not by hand', async () => {
    const store = await freshStore();
    store.getState().activateCase(CASE_001);
    store.getState().devUnlockAllEvidence(CASE_001);
    store.getState().dispatchCaseAction(CASE_001, {
      type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD',
    });

    const ids = store.getState().sessions[CASE_ID]!.discoveredEvidenceIds;
    const related = store.getState().dispatchCaseAction(CASE_001, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: ids[0]!,
      toEvidenceId: ids[1]!,
      kind: 'related',
    });
    const contradiction = store.getState().dispatchCaseAction(CASE_001, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: ids[2]!,
      toEvidenceId: ids[3]!,
      kind: 'contradicts',
    });

    // Going through the engine means the QA shortcut cannot produce a state
    // the game itself could never reach.
    expect(related.ok).toBe(true);
    expect(contradiction.ok).toBe(true);
    const connections = store.getState().sessions[CASE_ID]!.evidenceConnections;
    expect(connections).toHaveLength(2);
    expect(connections.some((item) => item.kind === 'contradicts')).toBe(true);
  });

  it('empties the wall without touching the investigation', async () => {
    const store = await freshStore();
    store.getState().activateCase(CASE_001);
    store.getState().devUnlockAllEvidence(CASE_001);
    store.getState().dispatchCaseAction(CASE_001, {
      type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD',
    });
    expect(
      Object.keys(store.getState().sessions[CASE_ID]!.evidenceBoard.placements)
        .length,
    ).toBeGreaterThan(0);

    store.getState().devResetBoard(CASE_ID);

    const session = store.getState().sessions[CASE_ID]!;
    expect(Object.keys(session.evidenceBoard.placements)).toHaveLength(0);
    expect(session.evidenceBoard.theoryClusters).toHaveLength(0);
    // Evidence is still held: only the wall was cleared.
    expect(session.discoveredEvidenceIds.length).toBeGreaterThan(0);
  });

  it('returns the case to briefing on reset', async () => {
    const store = await freshStore();
    store.getState().activateCase(CASE_001);
    store.getState().devCompleteCase(CASE_001);
    store.getState().clearCase(CASE_ID);

    expect(store.getState().sessions[CASE_ID]).toBeUndefined();
  });
});

function played(): CasePlayerState {
  const base = createInitialCasePlayerState(CASE_001);
  const ids = CASE_001.investigation.evidence.slice(0, 6).map((item) => item.id);
  return {
    ...base,
    phase: 'investigating',
    turn: 12,
    discoveredEvidenceIds: ids,
    viewedEvidenceIds: ids.slice(0, 3),
    evidenceConnections: [
      {
        id: 'connection-a',
        fromEvidenceId: ids[0]!,
        toEvidenceId: ids[1]!,
        kind: 'contradicts',
        createdOnTurn: 4,
      },
    ],
    evidenceBoard: {
      ...base.evidenceBoard,
      theoryClusters: [
        {
          id: 'theory-1',
          title: 'THEORY 01',
          evidenceIds: ids.slice(0, 3),
          createdOnTurn: 7,
        },
      ],
    },
  };
}

describe('inspectors', () => {
  const state = played();

  it('lists every evidence id with whether it is held and read', () => {
    const section = inspectEvidenceIds(CASE_001, state);
    expect(section.rows).toHaveLength(CASE_001.investigation.evidence.length);
    expect(section.rows.filter((row) => row.value === 'HELD · READ')).toHaveLength(3);
    expect(section.rows.filter((row) => row.value === 'HELD')).toHaveLength(3);
    expect(section.rows.some((row) => row.value === 'NOT FOUND')).toBe(true);
  });

  it('reports case state, and flags a content-version mismatch', () => {
    const section = inspectCaseState(CASE_001, state);
    const version = section.rows.find((row) => row.label === 'content version');
    expect(version?.detail).toContain('matches');

    const stale = inspectCaseState(CASE_001, { ...state, contentVersion: 0 });
    expect(
      stale.rows.find((row) => row.label === 'content version')?.detail,
    ).toContain('MISMATCH');
  });

  it('reports player, theory, connection, and timeline state', () => {
    expect(inspectPlayerState(CASE_001, state).rows.length).toBeGreaterThan(5);
    expect(inspectTheoryState(state).title).toContain('1 / 0');
    expect(inspectConnectionState(state).rows[0]?.label).toBe('CONTRADICTS');

    const timeline = inspectTimelineState(CASE_001, state);
    expect(timeline.rows).toHaveLength(CASE_001.investigation.timeline.length);
    expect(
      timeline.rows.every((row) =>
        ['PINNED', 'KNOWN', 'HIDDEN'].includes(row.value),
      ),
    ).toBe(true);
  });

  it('says so plainly when there is no session, instead of failing', () => {
    expect(inspectCaseState(CASE_001, null).empty).toBeTruthy();
    expect(inspectPlayerState(CASE_001, null).empty).toBeTruthy();
    expect(inspectTheoryState(null).empty).toBeTruthy();
    expect(inspectConnectionState(null).empty).toBeTruthy();
    expect(inspectEvidenceIds(CASE_001, null).rows.length).toBeGreaterThan(0);
  });

  it('reports entitlement state including the adapter in use', () => {
    const section = inspectEntitlementState({
      grants: [
        {
          id: 'complete:edition',
          source: 'developer',
          grantedAtEpochMs: 1_700_000_000_000,
          productId: null,
        },
      ],
      billingEnvironment: 'mock',
      billingAvailable: true,
      heldEntitlementIds: ['case:001', 'complete:edition', 'season:01'],
    });

    expect(section.rows[0]?.value).toBe('MOCK');
    expect(section.rows.find((row) => row.label === 'complete:edition')?.value).toBe(
      'DEVELOPER',
    );
  });
});

describe('canonical reveal', () => {
  it('returns the sealed record in a development test run', () => {
    // `__DEV__` is true under vitest, so the gate is open here — which is what
    // makes this assertion possible at all, and why the release check is a
    // bundle grep rather than a unit test.
    const reveal = loadCanonicalReveal(CASE_001.id, () => CASE001_SOLUTION_RECORD);
    expect(reveal).not.toBeNull();
    expect(reveal!.sections.map((section) => section.id)).toEqual([
      'responsible',
      'motive',
      'method',
      'concealment',
      'framing',
      'exclusions',
      'sequence',
    ]);
    expect(reveal!.sections.at(-1)!.lines.length).toBeGreaterThanOrEqual(10);
  });

  it('refuses a case it has no sealed record for', () => {
    expect(
      loadCanonicalReveal('case-002', () => CASE001_SOLUTION_RECORD),
    ).toBeNull();
    expect(
      loadDependencyGraph('case-002', [], () => CASE001_EVIDENCE_DEPENDENCIES),
    ).toBeNull();
  });

  it('reports dependency stages with how many artifacts are held', () => {
    const stages = loadDependencyGraph(
      CASE_001.id,
      ['evidence-photo-empty-plinth', 'evidence-photo-replica-macro'],
      () => CASE001_EVIDENCE_DEPENDENCIES,
    );
    expect(stages!.length).toBeGreaterThan(3);
    const first = stages![0]!;
    expect(first.held).toBe(2);
    expect(first.requiredEvidenceIds.length).toBeGreaterThan(first.held);
    expect(first.unlocks.length).toBeGreaterThan(0);
  });
});
