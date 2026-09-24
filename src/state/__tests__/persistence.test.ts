import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CASE_001 } from '@/case-content/cases/case001/case001.definition';

import {
  memoryStorageKeys,
  readMemoryStorage,
  resetMemoryStorage,
  writeMemoryStorage,
} from '../persistence/testing/memoryAsyncStorage';

/**
 * PHASE 10 — PERSISTENT INVESTIGATION STATE.
 *
 * Every test here runs offline against an in-memory device-storage double.
 * "Relaunching" the app is simulated by resetting the module registry so the
 * stores are constructed from scratch and must rehydrate from storage alone.
 */

const CASE_ID = CASE_001.id;
const SESSION_KEY = 'internet-detective.case-sessions';

type Stores = {
  session: typeof import('../case-session.store');
  profile: typeof import('../player-profile.store');
  playerState: typeof import('../playerState');
  autosave: typeof import('../persistence/autosaveStorage');
};

/** Cold launch: fresh modules, rehydrated from whatever is on the device. */
async function launchApp(): Promise<Stores> {
  vi.resetModules();
  const session = await import('../case-session.store');
  const profile = await import('../player-profile.store');
  const playerState = await import('../playerState');
  const autosave = await import('../persistence/autosaveStorage');

  await session.useCaseSessionStore.persist.rehydrate();
  await profile.usePlayerProfileStore.persist.rehydrate();

  return { session, profile, playerState, autosave };
}

/** Backgrounding: the lifecycle hook forces a synchronous flush. */
async function backgroundApp(stores: Stores) {
  await stores.autosave.flushAutosave();
}

function dispatch(
  stores: Stores,
  action: Parameters<
    ReturnType<typeof stores.session.useCaseSessionStore.getState>['dispatchCaseAction']
  >[1],
) {
  const result = stores.session.useCaseSessionStore
    .getState()
    .dispatchCaseAction(CASE_001, action);
  expect(result.ok, JSON.stringify(action)).toBe(true);
  return result;
}

beforeEach(() => {
  resetMemoryStorage();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('phase 10 · validation script', () => {
  it('survives closing and reopening the app, then a hard relaunch', async () => {
    // 1–5. Start Case 001, collect evidence, move it, connect it, write notes.
    let stores = await launchApp();
    const store = stores.session.useCaseSessionStore;

    store.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });
    dispatch(stores, { type: 'VISIT_SCENE', sceneId: 'scene-security-annex' });
    dispatch(stores, { type: 'VIEW_EVIDENCE', evidenceId: 'evidence-doc-camera-hash' });
    dispatch(stores, { type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' });
    dispatch(stores, {
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId: 'evidence-doc-camera-hash',
      x: 812,
      y: 566,
      rotation: 3,
    });
    dispatch(stores, {
      type: 'SET_EVIDENCE_BOARD_VIEWPORT',
      x: 140,
      y: 96,
      scale: 1.15,
    });
    dispatch(stores, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-doc-camera-hash',
      toEvidenceId: 'evidence-cctv-gallery',
      kind: 'supports',
    });
    dispatch(stores, {
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: 'evidence-doc-camera-hash',
      text: 'Frames repeat between 21:17:31 and 21:19:01. The feed is not an alibi.',
    });
    store.getState().setLastScreen(CASE_ID, '/investigation/leads');
    store.getState().setOpenEvidence(CASE_ID, 'evidence-doc-camera-hash');
    store.getState().accumulatePlayTime(CASE_ID, 65_000);

    const beforeClose = store.getState().sessions[CASE_ID]!;
    expect(beforeClose.discoveredEvidenceIds.length).toBeGreaterThan(5);

    // 6–7. Close the app and reopen it.
    await backgroundApp(stores);
    stores = await launchApp();

    // 8. Confirm everything remains.
    const restored = stores.session.useCaseSessionStore.getState();
    const session = restored.sessions[CASE_ID]!;
    expect(restored.activeCaseId).toBe(CASE_ID);
    expect(session.phase).toBe('investigating');
    expect(session.discoveredEvidenceIds).toEqual(beforeClose.discoveredEvidenceIds);
    expect(session.viewedEvidenceIds).toContain('evidence-doc-camera-hash');
    expect(session.evidenceBoard.placements['evidence-doc-camera-hash']).toMatchObject({
      x: 812,
      y: 566,
    });
    expect(session.evidenceBoard.viewport).toMatchObject({ scale: 1.15 });
    expect(session.evidenceConnections).toHaveLength(1);
    expect(session.evidenceNotes['evidence-doc-camera-hash']?.text).toContain('21:17:31');
    expect(restored.progress[CASE_ID]).toMatchObject({
      lastScreen: '/investigation/leads',
      openEvidenceId: 'evidence-doc-camera-hash',
    });
    expect(restored.progress[CASE_ID]!.investigationDurationMs).toBeGreaterThanOrEqual(
      65_000,
    );

    // 1–2 (second pass). Progress further, then kill the application.
    dispatch(stores, { type: 'USE_HINT', deductionId: 'deduction-camera-replay' });
    dispatch(stores, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-camera-replay',
      evidenceIds: ['evidence-cctv-gallery', 'evidence-doc-camera-hash'],
    });
    dispatch(stores, {
      type: 'CREATE_THEORY_CLUSTER',
      title: 'Replay window',
      evidenceIds: ['evidence-cctv-gallery', 'evidence-doc-camera-hash'],
    });
    dispatch(stores, {
      type: 'SET_TIMELINE_EVENT_PINNED',
      timelineEventId: 'timeline-2052-credential-clone',
      pinned: true,
    });
    stores.session.useCaseSessionStore
      .getState()
      .accumulatePlayTime(CASE_ID, 42_000);
    await backgroundApp(stores);

    // 3–4. Relaunch and confirm the state remains.
    stores = await launchApp();
    const afterKill = stores.session.useCaseSessionStore.getState().sessions[CASE_ID]!;
    expect(afterKill.solvedDeductionIds).toContain('deduction-camera-replay');
    expect(afterKill.hintsUsed.map((usage) => usage.deductionId)).toContain(
      'deduction-camera-replay',
    );
    expect(afterKill.evidenceBoard.theoryClusters).toHaveLength(1);
    expect(afterKill.pinnedTimelineEventIds).toContain('timeline-2052-credential-clone');
    expect(afterKill.evidenceNotes['evidence-doc-camera-hash']).toBeDefined();
    expect(
      stores.session.useCaseSessionStore.getState().progress[CASE_ID]!
        .investigationDurationMs,
    ).toBeGreaterThanOrEqual(107_000);
  });

  it('restores the interrupted evidence viewing context', async () => {
    let stores = await launchApp();
    stores.session.useCaseSessionStore.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });
    dispatch(stores, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-photo-empty-plinth',
    });
    await backgroundApp(stores);

    stores = await launchApp();
    expect(
      stores.session.useCaseSessionStore.getState().progress[CASE_ID]?.openEvidenceId,
    ).toBe('evidence-photo-empty-plinth');

    // Closing the viewer clears the resume marker.
    stores.session.useCaseSessionStore.getState().setOpenEvidence(CASE_ID, null);
    await backgroundApp(stores);
    stores = await launchApp();
    expect(
      stores.session.useCaseSessionStore.getState().progress[CASE_ID]?.openEvidenceId,
    ).toBeNull();
  });
});

describe('phase 10 · autosave behaviour', () => {
  it('coalesces frequent board writes into a single device write', async () => {
    const backend = {
      reads: 0,
      writes: [] as string[],
      data: new Map<string, string>(),
      async getItem(key: string) {
        this.reads += 1;
        return this.data.get(key) ?? null;
      },
      async setItem(key: string, value: string) {
        this.writes.push(key);
        this.data.set(key, value);
      },
      async removeItem(key: string) {
        this.data.delete(key);
      },
    };

    const { createAutosaveStorage } = await import('../persistence/autosaveStorage');
    const storage = createAutosaveStorage({ backend, debounceMs: 20 });

    for (let index = 0; index < 40; index += 1) {
      void storage.setItem('board', JSON.stringify({ x: index }));
    }
    expect(storage.pendingCount()).toBe(1);

    await storage.flush();
    expect(backend.writes.filter((key) => key === 'board')).toHaveLength(1);
    expect(backend.data.get('board')).toBe(JSON.stringify({ x: 39 }));
    expect(storage.lastWriteAtEpochMs()).not.toBeNull();
  });

  it('writes pending changes without an explicit flush once the debounce elapses', async () => {
    const backend = {
      data: new Map<string, string>(),
      async getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      async setItem(key: string, value: string) {
        this.data.set(key, value);
      },
      async removeItem(key: string) {
        this.data.delete(key);
      },
    };

    const { createAutosaveStorage } = await import('../persistence/autosaveStorage');
    const storage = createAutosaveStorage({ backend, debounceMs: 10 });

    await storage.setItem('progress', JSON.stringify({ saved: true }));
    expect(backend.data.get('progress')).toBe(JSON.stringify({ saved: true }));
  });
});

describe('phase 10 · data safety', () => {
  it('recovers from a corrupted save using the rolling backup', async () => {
    let stores = await launchApp();
    stores.session.useCaseSessionStore.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });
    dispatch(stores, { type: 'VISIT_SCENE', sceneId: 'scene-grand-rotunda' });
    await backgroundApp(stores);

    // A second write creates the rolling backup of the first good payload.
    dispatch(stores, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-photo-gala-wide',
    });
    await backgroundApp(stores);
    expect(readMemoryStorage(`${SESSION_KEY}.backup`)).not.toBeNull();

    // The live save is damaged (truncated write, disk corruption).
    writeMemoryStorage(SESSION_KEY, '{"state":{"sessions":{"case-001');

    stores = await launchApp();
    const recovered = stores.session.useCaseSessionStore.getState();
    expect(recovered.sessions[CASE_ID]).toBeDefined();
    expect(recovered.sessions[CASE_ID]!.visitedSceneIds).toContain('scene-grand-rotunda');

    // The damaged payload is quarantined, never deleted.
    expect(memoryStorageKeys()).toContain(`${SESSION_KEY}.corrupt`);
    const health = stores.autosave
      .getSaveHealth()
      .find((record) => record.key === SESSION_KEY);
    expect(health?.status).toBe('recovered');
    expect(health?.detail).toBeTruthy();
  });

  it('keeps readable cases when a single case entry is malformed', async () => {
    const { sanitizeCaseSessions } = await import(
      '../persistence/caseSessionMigrations'
    );

    const result = sanitizeCaseSessions({
      activeCaseId: 'case-broken',
      sessions: {
        [CASE_ID]: {
          caseId: CASE_ID,
          contentVersion: 1,
          phase: 'investigating',
          turn: 4,
          currentSceneId: 'scene-asterion-gallery',
          visitedSceneIds: ['scene-asterion-gallery'],
          discoveredEvidenceIds: ['evidence-photo-empty-plinth', 42],
          viewedEvidenceIds: null,
          evidenceNotes: { 'evidence-photo-empty-plinth': { text: 'seal intact' } },
          evidenceBoard: { placements: { a: { x: 'oops' } }, viewport: {} },
        },
        'case-broken': 'not-an-object',
      },
      progress: { [CASE_ID]: { investigationDurationMs: 'nope' } },
    });

    expect(result.droppedCaseIds).toEqual(['case-broken']);
    const repaired = result.value.sessions[CASE_ID]!;
    expect(repaired.discoveredEvidenceIds).toEqual(['evidence-photo-empty-plinth']);
    expect(repaired.viewedEvidenceIds).toEqual([]);
    expect(repaired.evidenceNotes['evidence-photo-empty-plinth']?.text).toBe(
      'seal intact',
    );
    expect(repaired.evidenceBoard.placements.a!.x).toBe(0);
    expect(result.value.progress[CASE_ID]!.investigationDurationMs).toBe(0);
    // An active case that no longer exists must not survive.
    expect(result.value.activeCaseId).toBeNull();
  });

  it('migrates a version 4 save into the phase 10 shape', async () => {
    const { migrateCaseSessions } = await import('../persistence/caseSessionMigrations');

    const migrated = migrateCaseSessions(
      {
        activeCaseId: CASE_ID,
        sessions: {
          [CASE_ID]: {
            caseId: CASE_ID,
            contentVersion: 1,
            phase: 'investigating',
            turn: 9,
            currentSceneId: 'scene-asterion-gallery',
            visitedSceneIds: ['scene-asterion-gallery'],
            discoveredEvidenceIds: ['evidence-photo-empty-plinth'],
            viewedEvidenceIds: ['evidence-photo-empty-plinth'],
            referencedEvidenceIds: [],
            evidenceConnections: [],
            theoryEvidenceIds: [],
            evidenceBoard: {
              placements: {},
              viewport: { x: 24, y: 24, scale: 0.82 },
              groups: [],
              theoryClusters: [],
            },
            fictionalInternet: {
              currentLocation: null,
              history: [],
              historyIndex: -1,
              visitedPageKeys: [],
              bookmarkedPageKeys: [],
            },
            solvedDeductionIds: [],
            deductionAttempts: {},
            accusationAttempts: [],
            resolution: null,
          },
        },
      },
      4,
    );

    const session = migrated.sessions[CASE_ID]!;
    expect(session.evidenceNotes).toEqual({});
    expect(session.pinnedTimelineEventIds).toEqual([]);
    expect(session.hintsUsed).toEqual([]);
    expect(session.turn).toBe(9);
    expect(migrated.progress[CASE_ID]).toBeDefined();
  });

  it('never erases progress when storage cannot be parsed and has no backup', async () => {
    writeMemoryStorage(SESSION_KEY, 'not json at all');
    const stores = await launchApp();

    expect(stores.session.useCaseSessionStore.getState().sessions).toEqual({});
    expect(memoryStorageKeys()).toContain(`${SESSION_KEY}.corrupt`);
    expect(readMemoryStorage(`${SESSION_KEY}.corrupt`)).toBe('not json at all');
    const health = stores.autosave
      .getSaveHealth()
      .find((record) => record.key === SESSION_KEY);
    expect(health?.status).toBe('quarantined');
  });
});

describe('phase 10 · profile, progression, and developer tools', () => {
  it('derives completed cases, achievements, and detective level from saved progress', async () => {
    let stores = await launchApp();
    const unsubscribe = stores.playerState.startProgressionBridge();

    stores.session.useCaseSessionStore.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });
    dispatch(stores, { type: 'VISIT_SCENE', sceneId: 'scene-security-annex' });
    dispatch(stores, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-camera-replay',
      evidenceIds: ['evidence-cctv-gallery', 'evidence-doc-camera-hash'],
    });

    const profile = stores.profile.usePlayerProfileStore.getState();
    expect(profile.currentCaseId).toBe(CASE_ID);
    expect(profile.achievements.map((record) => record.id)).toEqual(
      expect.arrayContaining([
        'achievement-first-artifact',
        'achievement-first-deduction',
      ]),
    );
    expect(profile.experience).toBeGreaterThan(0);
    expect(stores.profile.selectDetectiveLevel(profile).level).toBeGreaterThanOrEqual(1);

    unsubscribe();
    await backgroundApp(stores);

    stores = await launchApp();
    const restored = stores.profile.usePlayerProfileStore.getState();
    expect(restored.currentCaseId).toBe(CASE_ID);
    expect(restored.achievements.length).toBeGreaterThanOrEqual(2);
  });

  it('exposes developer-only reset, unlock, completion, and board tools', async () => {
    const stores = await launchApp();
    const store = stores.session.useCaseSessionStore;
    const unsubscribe = stores.playerState.startProgressionBridge();

    store.getState().activateCase(CASE_001);
    store.getState().devUnlockAllEvidence(CASE_001);
    expect(store.getState().sessions[CASE_ID]!.discoveredEvidenceIds).toHaveLength(
      CASE_001.investigation.evidence.length,
    );

    dispatch(stores, {
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId: 'evidence-photo-keyring',
      x: 400,
      y: 400,
      rotation: 0,
    });
    expect(
      Object.keys(store.getState().sessions[CASE_ID]!.evidenceBoard.placements),
    ).toHaveLength(1);
    store.getState().devResetBoard(CASE_ID);
    expect(
      Object.keys(store.getState().sessions[CASE_ID]!.evidenceBoard.placements),
    ).toHaveLength(0);

    store.getState().devCompleteCase(CASE_001);
    expect(store.getState().sessions[CASE_ID]!.phase).toBe('resolved');
    expect(store.getState().progress[CASE_ID]!.completed).toBe(true);
    expect(
      stores.profile.usePlayerProfileStore.getState().completedCaseIds,
    ).toContain(CASE_ID);

    store.getState().clearCase(CASE_ID);
    expect(store.getState().sessions[CASE_ID]).toBeUndefined();
    expect(store.getState().progress[CASE_ID]).toBeUndefined();
    expect(store.getState().activeCaseId).toBeNull();

    unsubscribe();
  });
});
