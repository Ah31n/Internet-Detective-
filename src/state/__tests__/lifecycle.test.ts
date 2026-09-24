import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CASE_001 } from '@/case-content/cases/case001/case001.definition';

import {
  readMemoryStorage,
  resetMemoryStorage,
  writeMemoryStorage,
} from '../persistence/testing/memoryAsyncStorage';

/**
 * PHASE 16 — THE LIFECYCLE THE BRIEF ASKS FOR, EXECUTED.
 *
 *     launch -> background -> foreground -> navigate -> background -> return
 *
 * Every step runs against the in-memory device-storage double. "Backgrounding"
 * is the real flush the lifecycle hook performs; "relaunching" resets the
 * module registry so the stores are rebuilt and must rehydrate from storage
 * alone, exactly as a cold start would.
 *
 * The assertion is not that it does not crash. It is that the investigation
 * comes back *identical*, every time, including the half-finished parts.
 */

const CASE_ID = CASE_001.id;
const SHELL_KEY = 'internet-detective.app-shell';

type Stores = {
  app: typeof import('../app.store');
  session: typeof import('../case-session.store');
  profile: typeof import('../player-profile.store');
  entitlements: typeof import('../entitlement.store');
  autosave: typeof import('../persistence/autosaveStorage');
};

async function launch(): Promise<Stores> {
  vi.resetModules();
  const app = await import('../app.store');
  const session = await import('../case-session.store');
  const profile = await import('../player-profile.store');
  const entitlements = await import('../entitlement.store');
  const autosave = await import('../persistence/autosaveStorage');

  await app.useAppStore.persist.rehydrate();
  await session.useCaseSessionStore.persist.rehydrate();
  await profile.usePlayerProfileStore.persist.rehydrate();
  await entitlements.useEntitlementStore.persist.rehydrate();

  return { app, session, profile, entitlements, autosave };
}

/** iOS sends 'inactive' before backgrounding; the hook flushes on both. */
async function background(stores: Stores) {
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

function session(stores: Stores) {
  return stores.session.useCaseSessionStore.getState().sessions[CASE_ID]!;
}

describe('phase 16 · launch, background, foreground, navigate, background, return', () => {
  beforeEach(() => {
    resetMemoryStorage();
  });

  it('carries a part-finished investigation through the whole cycle intact', async () => {
    // ---- launch -------------------------------------------------------
    let stores = await launch();
    stores.session.useCaseSessionStore.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });

    const firstScene = CASE_001.investigation.startingSceneId;
    dispatch(stores, { type: 'VISIT_SCENE', sceneId: firstScene });

    const discovered = session(stores).discoveredEvidenceIds;
    expect(discovered.length).toBeGreaterThan(2);

    dispatch(stores, { type: 'VIEW_EVIDENCE', evidenceId: discovered[0]! });
    dispatch(stores, {
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: discovered[0]!,
      text: 'Seal intact. Nobody opened this case the ordinary way.',
    });
    dispatch(stores, { type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' });
    dispatch(stores, {
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId: discovered[0]!,
      x: 412,
      y: 268,
      rotation: -1.75,
    });
    dispatch(stores, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: discovered[0]!,
      toEvidenceId: discovered[1]!,
      kind: 'contradicts',
    });
    dispatch(stores, {
      type: 'SET_EVIDENCE_BOARD_VIEWPORT',
      x: -180,
      y: -90,
      scale: 1.35,
    });
    stores.app.useAppStore.getState().rememberRoute('/investigation/leads');

    const beforeBackground = JSON.stringify(session(stores));

    // ---- background ---------------------------------------------------
    await background(stores);
    expect(stores.autosave.autosaveStorage.pendingCount()).toBe(0);

    // ---- foreground ---------------------------------------------------
    stores = await launch();
    expect(JSON.stringify(session(stores))).toBe(beforeBackground);
    expect(stores.app.useAppStore.getState().lastRoute).toBe(
      '/investigation/leads',
    );

    // ---- navigate -----------------------------------------------------
    stores.app.useAppStore.getState().rememberRoute('/investigation/evidence');
    stores.session.useCaseSessionStore
      .getState()
      .setOpenEvidence(CASE_ID, discovered[1]!);
    dispatch(stores, { type: 'VIEW_EVIDENCE', evidenceId: discovered[1]! });
    dispatch(stores, {
      type: 'SET_TIMELINE_EVENT_PINNED',
      timelineEventId: CASE_001.investigation.timeline[0]!.id,
      pinned: true,
    });

    const beforeSecondBackground = JSON.stringify(session(stores));

    // ---- background ---------------------------------------------------
    await background(stores);

    // ---- return -------------------------------------------------------
    stores = await launch();
    const restored = session(stores);

    expect(JSON.stringify(restored)).toBe(beforeSecondBackground);
    expect(stores.app.useAppStore.getState().lastRoute).toBe(
      '/investigation/evidence',
    );
    expect(
      stores.session.useCaseSessionStore.getState().progress[CASE_ID]
        ?.openEvidenceId,
    ).toBe(discovered[1]!);

    // The details that make it the same investigation, not a similar one.
    expect(restored.evidenceNotes[discovered[0]!]?.text).toContain('Seal intact');
    expect(restored.evidenceBoard.placements[discovered[0]!]).toMatchObject({
      x: 412,
      y: 268,
    });
    expect(restored.evidenceBoard.viewport.scale).toBeCloseTo(1.35, 5);
    expect(restored.evidenceConnections[0]?.kind).toBe('contradicts');
    expect(restored.pinnedTimelineEventIds).toHaveLength(1);
    expect(restored.viewedEvidenceIds).toContain(discovered[1]!);
  });

  it('never loses board positions to an interrupted background', async () => {
    let stores = await launch();
    stores.session.useCaseSessionStore.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });
    dispatch(stores, {
      type: 'VISIT_SCENE',
      sceneId: CASE_001.investigation.startingSceneId,
    });
    dispatch(stores, { type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' });

    const target = session(stores).discoveredEvidenceIds[0]!;
    // A flurry of drags, exactly as the board dispatches them, with no flush
    // in between — the autosave transport has to coalesce these itself.
    for (let index = 0; index < 25; index += 1) {
      dispatch(stores, {
        type: 'MOVE_EVIDENCE_ON_BOARD',
        evidenceId: target,
        x: 100 + index,
        y: 200 + index,
        rotation: 0,
      });
    }

    await background(stores);
    stores = await launch();

    expect(session(stores).evidenceBoard.placements[target]).toMatchObject({
      x: 124,
      y: 224,
    });
  });

  it('recovers from a route this build no longer has, instead of a blank screen', async () => {
    // A shell written by an older version, naming a screen that is gone. The
    // launch sequence ends in router.replace(lastRoute), so an unvalidated
    // value here is a dead-end launch — every launch, since nothing rewrites
    // it.
    writeMemoryStorage(
      SHELL_KEY,
      JSON.stringify({
        version: 3,
        state: {
          lastRoute: '/case-files-legacy',
          lastInvestigationRoute: '/investigation/dossier',
          settings: {},
        },
      }),
    );

    const stores = await launch();
    expect(stores.app.useAppStore.getState().lastRoute).toBe(
      '/investigation-home',
    );
    expect(stores.app.useAppStore.getState().lastInvestigationRoute).toBe(
      '/investigation',
    );
  });

  it('keeps settings and entitlements across the cycle', async () => {
    let stores = await launch();
    stores.app.useAppStore.getState().setSetting('reduceMotion', true);
    stores.app.useAppStore.getState().setSetting('textScale', 'larger');
    stores.entitlements.useEntitlementStore.getState().devGrant('season:01');

    await background(stores);
    stores = await launch();

    const settings = stores.app.useAppStore.getState().settings;
    expect(settings.reduceMotion).toBe(true);
    expect(settings.textScale).toBe('larger');
    expect(
      stores.entitlements.useEntitlementStore
        .getState()
        .grants.map((grant) => grant.id),
    ).toEqual(['season:01']);
  });

  it('leaves a readable payload on disk after every background', async () => {
    const stores = await launch();
    stores.session.useCaseSessionStore.getState().activateCase(CASE_001);
    dispatch(stores, { type: 'BEGIN_INVESTIGATION' });
    await background(stores);

    for (const key of [
      'internet-detective.app-shell',
      'internet-detective.case-sessions',
    ]) {
      const raw = readMemoryStorage(key);
      expect(raw, key).toBeTruthy();
      expect(() => JSON.parse(raw!), key).not.toThrow();
    }
  });
});
