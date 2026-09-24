import { describe, expect, it } from 'vitest';

import {
  createEvidenceConnectionId,
  createFictionalPageKey,
  createInitialCasePlayerState,
  createInvestigationViewModel,
  searchFictionalInternet,
  transitionCase,
  validateCaseDefinition,
  type CaseAction,
  type CaseDefinition,
  type CasePlayerState,
} from '../index';
import { verificationCase } from '../testing/verificationCase';

function apply(
  definition: CaseDefinition,
  state: CasePlayerState,
  action: CaseAction,
) {
  const result = transitionCase(definition, state, action);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function runCanonicalSequence() {
  let state = createInitialCasePlayerState(verificationCase);
  state = apply(verificationCase, state, { type: 'BEGIN_INVESTIGATION' });
  state = apply(verificationCase, state, {
    type: 'VIEW_EVIDENCE',
    evidenceId: 'evidence-header',
  });
  state = apply(verificationCase, state, {
    type: 'VISIT_SCENE',
    sceneId: 'scene-archive',
  });
  state = apply(verificationCase, state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-origin',
    evidenceIds: ['evidence-timezone', 'evidence-header'],
  });
  state = apply(verificationCase, state, {
    type: 'SUBMIT_ACCUSATION',
    answers: { 'question-actor': 'actor-b' },
  });
  return state;
}

describe('CaseDefinition validation', () => {
  it('accepts a complete structured definition', () => {
    expect(validateCaseDefinition(verificationCase)).toEqual([]);
  });

  it('rejects broken authored references before play', () => {
    const broken = {
      ...verificationCase,
      investigation: {
        ...verificationCase.investigation,
        startingSceneId: 'missing-scene',
      },
    } as unknown as CaseDefinition;

    expect(validateCaseDefinition(broken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNKNOWN_REFERENCE',
          path: 'investigation.startingSceneId',
        }),
      ]),
    );
  });
});

describe('deterministic transition engine', () => {
  it('produces identical state for identical definitions and actions', () => {
    expect(runCanonicalSequence()).toEqual(runCanonicalSequence());
  });

  it('keeps authored truth out of initial player state', () => {
    const state = createInitialCasePlayerState(verificationCase);

    expect(state).not.toHaveProperty('canonicalTruth');
    expect(state.caseId).toBe(verificationCase.id);
    expect(state.phase).toBe('briefing');
  });

  it('does not mutate state when an action is invalid', () => {
    const state = createInitialCasePlayerState(verificationCase);
    const result = transitionCase(verificationCase, state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-archive',
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) expect(result.error.code).toBe('INVALID_PHASE');
  });

  it('evaluates deductions by exact canonical evidence sets', () => {
    let state = createInitialCasePlayerState(verificationCase);
    state = apply(verificationCase, state, { type: 'BEGIN_INVESTIGATION' });
    state = apply(verificationCase, state, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-header',
    });
    state = apply(verificationCase, state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-archive',
    });
    state = apply(verificationCase, state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-origin',
      evidenceIds: ['evidence-header', 'evidence-decoy'],
    });

    expect(state.solvedDeductionIds).toEqual([]);
    expect(state.deductionAttempts['deduction-origin']?.[0]?.correct).toBe(false);

    state = apply(verificationCase, state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-origin',
      evidenceIds: ['evidence-timezone', 'evidence-header'],
    });
    expect(state.solvedDeductionIds).toEqual(['deduction-origin']);
  });

  it('uses canonical answers and deterministic penalties to resolve', () => {
    let state = createInitialCasePlayerState(verificationCase);
    state = apply(verificationCase, state, { type: 'BEGIN_INVESTIGATION' });
    state = apply(verificationCase, state, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-header',
    });
    state = apply(verificationCase, state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-archive',
    });
    state = apply(verificationCase, state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-origin',
      evidenceIds: ['evidence-header', 'evidence-decoy'],
    });
    state = apply(verificationCase, state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-origin',
      evidenceIds: ['evidence-header', 'evidence-timezone'],
    });
    state = apply(verificationCase, state, {
      type: 'SUBMIT_ACCUSATION',
      answers: { 'question-actor': 'actor-a' },
    });
    state = apply(verificationCase, state, {
      type: 'SUBMIT_ACCUSATION',
      answers: { 'question-actor': 'actor-b' },
    });

    expect(state.phase).toBe('resolved');
    expect(state.resolution?.score).toBe(80);
  });
});

describe('truth-redacted view model', () => {
  it('exposes authored content but not canonical truth before resolution', () => {
    const state = createInitialCasePlayerState(verificationCase);
    const view = createInvestigationViewModel(verificationCase, state);

    expect(view).not.toHaveProperty('canonicalTruth');
    expect(view.resolution).toBeNull();
    expect(view.title).toBe(verificationCase.metadata.title);
  });

  it('reveals only authored resolution copy after deterministic success', () => {
    const view = createInvestigationViewModel(
      verificationCase,
      runCanonicalSequence(),
    );

    expect(view.resolution).toEqual({
      score: 100,
      maximumScore: 100,
      headline: 'Verification complete',
      summary: 'The deterministic authored path was resolved.',
    });
  });
});

describe('reusable evidence system', () => {
  function discoverFixtureEvidence() {
    let state = createInitialCasePlayerState(verificationCase);
    state = apply(verificationCase, state, { type: 'BEGIN_INVESTIGATION' });
    state = apply(verificationCase, state, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-header',
    });
    state = apply(verificationCase, state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-archive',
    });
    return state;
  }

  it('supports every authored evidence viewer type with stable IDs', () => {
    const evidence = verificationCase.investigation.evidence;
    expect(new Set(evidence.map((item) => item.type))).toEqual(
      new Set([
        'photo',
        'document',
        'receipt',
        'message',
        'email',
        'cctv',
        'webpage',
        'statement',
      ]),
    );
    expect(new Set(evidence.map((item) => item.id)).size).toBe(evidence.length);
  });

  it('records viewed and referenced state independently and idempotently', () => {
    let state = discoverFixtureEvidence();
    state = apply(verificationCase, state, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-photo',
    });
    const viewedTurn = state.turn;
    state = apply(verificationCase, state, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-photo',
    });
    expect(state.turn).toBe(viewedTurn);
    expect(state.viewedEvidenceIds).toContain('evidence-photo');

    state = apply(verificationCase, state, {
      type: 'SET_EVIDENCE_REFERENCED',
      evidenceId: 'evidence-photo',
      referenced: true,
    });
    expect(state.referencedEvidenceIds).toContain('evidence-photo');
    expect(state.viewedEvidenceIds).toContain('evidence-photo');

    state = apply(verificationCase, state, {
      type: 'SET_EVIDENCE_REFERENCED',
      evidenceId: 'evidence-photo',
      referenced: false,
    });
    expect(state.referencedEvidenceIds).not.toContain('evidence-photo');
  });

  it('creates and removes stable evidence connections', () => {
    let state = discoverFixtureEvidence();
    const connectionId = createEvidenceConnectionId(
      'evidence-header',
      'evidence-timezone',
      'supports',
    );
    state = apply(verificationCase, state, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-header',
      toEvidenceId: 'evidence-timezone',
      kind: 'supports',
    });

    expect(state.evidenceConnections).toEqual([
      expect.objectContaining({ id: connectionId, kind: 'supports' }),
    ]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);

    state = apply(verificationCase, state, {
      type: 'DISCONNECT_EVIDENCE',
      connectionId,
    });
    expect(state.evidenceConnections).toEqual([]);
  });

  it('rejects self-connections without mutating player state', () => {
    const state = discoverFixtureEvidence();
    const result = transitionCase(verificationCase, state, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-header',
      toEvidenceId: 'evidence-header',
      kind: 'related',
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_EVIDENCE_CONNECTION');
    }
  });

  it('marks submitted evidence as used in theories', () => {
    let state = discoverFixtureEvidence();
    state = apply(verificationCase, state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-origin',
      evidenceIds: ['evidence-header', 'evidence-decoy'],
    });

    expect(state.theoryEvidenceIds).toEqual([
      'evidence-header',
      'evidence-decoy',
    ]);
    const view = createInvestigationViewModel(verificationCase, state);
    expect(
      view.discoveredEvidence.find((item) => item.id === 'evidence-decoy')
        ?.usedInTheory,
    ).toBe(true);
  });
});

describe('local fictional internet', () => {
  function begin() {
    return apply(
      verificationCase,
      createInitialCasePlayerState(verificationCase),
      { type: 'BEGIN_INVESTIGATION' },
    );
  }

  it('uses reserved offline hosts and unique site identities', () => {
    const sites = verificationCase.investigation.internet.sites;
    expect(sites.every((site) => site.identity.fictionalHost.endsWith('.invalid'))).toBe(true);
    expect(new Set(sites.map((site) => site.identity.identityId)).size).toBe(sites.length);
    expect(new Set(sites.map((site) => site.identity.layout)).size).toBe(sites.length);
  });

  it('discovers canonical evidence only through authored local page data', () => {
    let state = begin();
    expect(state.discoveredEvidenceIds).not.toContain('evidence-timezone');

    state = apply(verificationCase, state, {
      type: 'OPEN_INTERNET_PAGE',
      siteId: 'site-signal-ledger',
      pageId: 'ledger-home',
    });

    expect(state.discoveredEvidenceIds).toContain('evidence-timezone');
    expect(state.fictionalInternet.currentLocation).toEqual({
      siteId: 'site-signal-ledger',
      pageId: 'ledger-home',
    });
  });

  it('persists deterministic local history, forward/back, visits, and bookmarks', () => {
    let state = begin();
    state = apply(verificationCase, state, {
      type: 'OPEN_INTERNET_PAGE',
      siteId: 'site-signal-ledger',
      pageId: 'ledger-home',
    });
    state = apply(verificationCase, state, {
      type: 'OPEN_INTERNET_PAGE',
      siteId: 'site-hushboard',
      pageId: 'board-home',
    });
    state = apply(verificationCase, state, { type: 'INTERNET_BACK' });
    expect(state.fictionalInternet.currentLocation?.siteId).toBe('site-signal-ledger');
    state = apply(verificationCase, state, { type: 'INTERNET_FORWARD' });
    expect(state.fictionalInternet.currentLocation?.siteId).toBe('site-hushboard');

    state = apply(verificationCase, state, {
      type: 'SET_INTERNET_PAGE_BOOKMARKED',
      siteId: 'site-hushboard',
      pageId: 'board-home',
      bookmarked: true,
    });
    expect(state.fictionalInternet.bookmarkedPageKeys).toContain(
      createFictionalPageKey('site-hushboard', 'board-home'),
    );
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('searches only the authored in-memory case index', () => {
    expect(
      searchFictionalInternet(
        verificationCase,
        createInitialCasePlayerState(verificationCase),
        'archive',
      ),
    ).toEqual([]);

    const results = searchFictionalInternet(
      verificationCase,
      begin(),
      'archive timezone',
    );

    expect(results).toEqual([
      expect.objectContaining({
        siteId: 'site-signal-ledger',
        pageId: 'ledger-home',
        fictionalHost: 'signal-ledger.invalid',
      }),
    ]);
  });

  it('refuses navigation to any node not authored in the case definition', () => {
    const state = begin();
    const result = transitionCase(verificationCase, state, {
      type: 'OPEN_INTERNET_PAGE',
      siteId: 'public-internet',
      pageId: 'search',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected an unknown-site failure.');
    expect(result.error.code).toBe('UNKNOWN_FICTIONAL_SITE');
    expect(result.state).toBe(state);
  });

  it('rejects real hosts and reused site identities during validation', () => {
    const [first, second] = verificationCase.investigation.internet.sites;
    const broken = {
      ...verificationCase,
      investigation: {
        ...verificationCase.investigation,
        internet: {
          sites: [
            {
              ...first,
              identity: {
                ...first.identity,
                fictionalHost: 'https://real.example.com',
              },
            },
            {
              ...second,
              identity: {
                ...second.identity,
                identityId: first.identity.identityId,
              },
            },
          ],
        },
      },
    } as unknown as CaseDefinition;

    const codes = validateCaseDefinition(broken).map((issue) => issue.code);
    expect(codes).toContain('NON_FICTIONAL_HOST');
    expect(codes).toContain('DUPLICATE_SITE_IDENTITY');
  });
});

describe('touch evidence board state', () => {
  function preparedBoard() {
    let state = createInitialCasePlayerState(verificationCase);
    state = apply(verificationCase, state, { type: 'BEGIN_INVESTIGATION' });
    state = apply(verificationCase, state, {
      type: 'VIEW_EVIDENCE',
      evidenceId: 'evidence-header',
    });
    state = apply(verificationCase, state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-archive',
    });
    state = apply(verificationCase, state, {
      type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD',
    });
    return state;
  }

  it('places every discovered artifact deterministically and only once', () => {
    const first = preparedBoard();
    const second = preparedBoard();

    expect(first.evidenceBoard.placements).toEqual(second.evidenceBoard.placements);
    expect(Object.keys(first.evidenceBoard.placements)).toEqual(
      first.discoveredEvidenceIds,
    );

    const repeated = apply(verificationCase, first, {
      type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD',
    });
    expect(repeated).toBe(first);
  });

  it('persists settled positions, rotation, stacking order, and viewport', () => {
    let state = preparedBoard();
    const evidenceId = state.discoveredEvidenceIds[0]!;
    state = apply(verificationCase, state, {
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId,
      x: 842.5,
      y: 611.25,
      rotation: -2.4,
    });
    state = apply(verificationCase, state, {
      type: 'SET_EVIDENCE_BOARD_VIEWPORT',
      x: -320,
      y: -180,
      scale: 1.36,
    });

    expect(state.evidenceBoard.placements[evidenceId]).toEqual(
      expect.objectContaining({ x: 842.5, y: 611.25, rotation: -2.4 }),
    );
    expect(state.evidenceBoard.viewport).toEqual({
      x: -320,
      y: -180,
      scale: 1.36,
    });
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('creates persistent evidence groups and independent theory clusters', () => {
    let state = preparedBoard();
    const evidenceIds = state.discoveredEvidenceIds.slice(0, 2);
    state = apply(verificationCase, state, {
      type: 'CREATE_EVIDENCE_BOARD_GROUP',
      label: 'TIMELINE FRAGMENTS',
      evidenceIds,
    });
    state = apply(verificationCase, state, {
      type: 'CREATE_THEORY_CLUSTER',
      title: 'ALTERED RECORD THEORY',
      evidenceIds,
    });

    expect(state.evidenceBoard.groups).toEqual([
      expect.objectContaining({
        label: 'TIMELINE FRAGMENTS',
        evidenceIds,
      }),
    ]);
    expect(state.evidenceBoard.theoryClusters).toEqual([
      expect.objectContaining({
        title: 'ALTERED RECORD THEORY',
        evidenceIds,
      }),
    ]);
  });

  it('supports contradiction strings and rejects invalid board selections', () => {
    let state = preparedBoard();
    const [fromEvidenceId, toEvidenceId] = state.discoveredEvidenceIds;
    state = apply(verificationCase, state, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: fromEvidenceId!,
      toEvidenceId: toEvidenceId!,
      kind: 'contradicts',
    });
    expect(state.evidenceConnections[0]?.kind).toBe('contradicts');

    const invalid = transitionCase(verificationCase, state, {
      type: 'CREATE_THEORY_CLUSTER',
      title: 'INVALID',
      evidenceIds: [fromEvidenceId!],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe('INVALID_EVIDENCE_BOARD_SELECTION');
      expect(invalid.state).toBe(state);
    }
  });
});
