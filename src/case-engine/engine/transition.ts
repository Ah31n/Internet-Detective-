import type {
  CaseEngineError,
  CaseEngineEvent,
  CaseAction,
} from '../domain/case-action';
import type {
  CaseDefinition,
  DeductionId,
  OptionId,
  QuestionId,
  SceneDefinition,
  TimelineEventId,
} from '../domain/case-definition';
import type {
  EvidenceConnectionKind,
  EvidenceId,
} from '../domain/evidence';
import type { FictionalInternetLocation } from '../domain/fictional-internet';
import type { CasePlayerState } from '../domain/player-state';
import {
  isAccusationAvailable,
  isConditionMet,
} from './conditions';
import {
  createDefaultEvidenceBoardPlacement,
  createEmptyEvidenceBoardState,
  isFiniteEvidenceBoardTransform,
  normalizeEvidenceBoardPlacement,
  normalizeEvidenceBoardViewport,
} from './evidence-board';
import {
  createFictionalPageKey,
  getFictionalPage,
  getFictionalSite,
} from './fictional-internet';
import { assertValidCaseDefinition } from './validation';

export type CaseTransitionResult =
  | {
      ok: true;
      state: CasePlayerState;
      events: readonly CaseEngineEvent[];
    }
  | {
      ok: false;
      state: CasePlayerState;
      events: readonly [];
      error: CaseEngineError;
    };

export function createInitialCasePlayerState(
  definition: CaseDefinition,
): CasePlayerState {
  assertValidCaseDefinition(definition);

  return {
    caseId: definition.id,
    contentVersion: definition.contentVersion,
    phase: 'briefing',
    turn: 0,
    currentSceneId: null,
    visitedSceneIds: [],
    discoveredEvidenceIds: [...definition.investigation.startingEvidenceIds],
    viewedEvidenceIds: [],
    referencedEvidenceIds: [],
    evidenceConnections: [],
    evidenceNotes: {},
    theoryEvidenceIds: [],
    pinnedTimelineEventIds: [],
    hintsUsed: [],
    evidenceBoard: createEmptyEvidenceBoardState(),
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
  };
}

export function transitionCase(
  definition: CaseDefinition,
  state: CasePlayerState,
  action: CaseAction,
): CaseTransitionResult {
  if (state.caseId !== definition.id) {
    return failure(state, 'CASE_MISMATCH', 'Player state belongs to another case.');
  }
  if (state.contentVersion !== definition.contentVersion) {
    return failure(
      state,
      'CONTENT_VERSION_MISMATCH',
      'Player state requires a content migration before it can continue.',
    );
  }
  if (
    state.phase === 'resolved' &&
    ![
      'VIEW_EVIDENCE',
      'SET_EVIDENCE_REFERENCED',
      'CONNECT_EVIDENCE',
      'DISCONNECT_EVIDENCE',
      'SET_EVIDENCE_NOTE',
      'SET_TIMELINE_EVENT_PINNED',
      'PLACE_DISCOVERED_EVIDENCE_ON_BOARD',
      'MOVE_EVIDENCE_ON_BOARD',
      'SET_EVIDENCE_BOARD_VIEWPORT',
      'CREATE_EVIDENCE_BOARD_GROUP',
      'DELETE_EVIDENCE_BOARD_GROUP',
      'CREATE_THEORY_CLUSTER',
      'DELETE_THEORY_CLUSTER',
      'OPEN_INTERNET_PAGE',
      'INTERNET_BACK',
      'INTERNET_FORWARD',
      'SET_INTERNET_PAGE_BOOKMARKED',
    ].includes(action.type)
  ) {
    return failure(state, 'CASE_ALREADY_RESOLVED', 'The case is already resolved.');
  }

  switch (action.type) {
    case 'BEGIN_INVESTIGATION':
      return beginInvestigation(definition, state);
    case 'VISIT_SCENE':
      return visitScene(definition, state, action.sceneId);
    case 'VIEW_EVIDENCE':
      return viewEvidence(definition, state, action.evidenceId);
    case 'SET_EVIDENCE_REFERENCED':
      return setEvidenceReferenced(
        definition,
        state,
        action.evidenceId,
        action.referenced,
      );
    case 'CONNECT_EVIDENCE':
      return connectEvidence(
        definition,
        state,
        action.fromEvidenceId,
        action.toEvidenceId,
        action.kind,
      );
    case 'DISCONNECT_EVIDENCE':
      return disconnectEvidence(state, action.connectionId);
    case 'SET_EVIDENCE_NOTE':
      return setEvidenceNote(definition, state, action.evidenceId, action.text);
    case 'SET_TIMELINE_EVENT_PINNED':
      return setTimelineEventPinned(
        definition,
        state,
        action.timelineEventId,
        action.pinned,
      );
    case 'USE_HINT':
      return spendHint(definition, state, action.deductionId);
    case 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD':
      return placeDiscoveredEvidenceOnBoard(definition, state);
    case 'MOVE_EVIDENCE_ON_BOARD':
      return moveEvidenceOnBoard(
        definition,
        state,
        action.evidenceId,
        action.x,
        action.y,
        action.rotation,
      );
    case 'SET_EVIDENCE_BOARD_VIEWPORT':
      return setEvidenceBoardViewport(state, action.x, action.y, action.scale);
    case 'CREATE_EVIDENCE_BOARD_GROUP':
      return createEvidenceBoardGroup(
        definition,
        state,
        action.label,
        action.evidenceIds,
      );
    case 'DELETE_EVIDENCE_BOARD_GROUP':
      return deleteEvidenceBoardGroup(state, action.groupId);
    case 'CREATE_THEORY_CLUSTER':
      return createTheoryCluster(
        definition,
        state,
        action.title,
        action.evidenceIds,
      );
    case 'DELETE_THEORY_CLUSTER':
      return deleteTheoryCluster(state, action.clusterId);
    case 'OPEN_INTERNET_PAGE':
      return openInternetPage(
        definition,
        state,
        { siteId: action.siteId, pageId: action.pageId },
      );
    case 'INTERNET_BACK':
      return moveInternetHistory(definition, state, 'back');
    case 'INTERNET_FORWARD':
      return moveInternetHistory(definition, state, 'forward');
    case 'SET_INTERNET_PAGE_BOOKMARKED':
      return setInternetPageBookmarked(
        definition,
        state,
        { siteId: action.siteId, pageId: action.pageId },
        action.bookmarked,
      );
    case 'SUBMIT_DEDUCTION':
      return submitDeduction(
        definition,
        state,
        action.deductionId,
        action.evidenceIds,
      );
    case 'SUBMIT_ACCUSATION':
      return submitAccusation(definition, state, action.answers);
  }
}

function beginInvestigation(
  definition: CaseDefinition,
  state: CasePlayerState,
): CaseTransitionResult {
  if (state.phase !== 'briefing') {
    return failure(state, 'INVALID_PHASE', 'The investigation has already started.');
  }

  const scene = definition.investigation.scenes.find(
    (item) => item.id === definition.investigation.startingSceneId,
  )!;
  const turn = state.turn + 1;
  const entered = enterScene(
    definition,
    { ...state, phase: 'investigating', turn },
    scene,
  );

  return {
    ok: true,
    state: entered.state,
    events: [
      { type: 'investigation_started', turn },
      ...entered.events,
    ],
  };
}

function visitScene(
  definition: CaseDefinition,
  state: CasePlayerState,
  sceneId: string,
): CaseTransitionResult {
  const phaseError = requireInvestigation(state);
  if (phaseError) return phaseError;

  const scene = definition.investigation.scenes.find((item) => item.id === sceneId);
  if (!scene) return failure(state, 'UNKNOWN_SCENE', `Scene "${sceneId}" does not exist.`);
  if (!isConditionMet(scene.openWhen, state)) {
    return failure(state, 'SCENE_LOCKED', `Scene "${sceneId}" is not available.`);
  }

  const turn = state.turn + 1;
  const entered = enterScene(definition, { ...state, turn }, scene);
  return { ok: true, state: entered.state, events: entered.events };
}

function enterScene(
  definition: CaseDefinition,
  state: CasePlayerState,
  scene: SceneDefinition,
) {
  const visitedSceneIds = appendUnique(state.visitedSceneIds, scene.id);
  const newlyDiscovered = scene.revealsEvidenceIds.filter(
    (id) => !state.discoveredEvidenceIds.includes(id),
  );
  const discoveredEvidenceIds = orderEvidenceIds(
    definition,
    [...state.discoveredEvidenceIds, ...newlyDiscovered],
  );

  return {
    state: {
      ...state,
      currentSceneId: scene.id,
      visitedSceneIds,
      discoveredEvidenceIds,
    },
    events: [
      { type: 'scene_entered', turn: state.turn, sceneId: scene.id } as const,
      ...newlyDiscovered.map(
        (evidenceId) =>
          ({
            type: 'evidence_discovered',
            turn: state.turn,
            evidenceId,
          }) as const,
      ),
    ],
  };
}

function viewEvidence(
  definition: CaseDefinition,
  state: CasePlayerState,
  evidenceId: EvidenceId,
): CaseTransitionResult {
  const evidenceError = requireAvailableEvidence(definition, state, evidenceId);
  if (evidenceError) return evidenceError;
  if (state.viewedEvidenceIds.includes(evidenceId)) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      viewedEvidenceIds: orderEvidenceIds(definition, [
        ...state.viewedEvidenceIds,
        evidenceId,
      ]),
    },
    events: [{ type: 'evidence_viewed', turn, evidenceId }],
  };
}

function setEvidenceReferenced(
  definition: CaseDefinition,
  state: CasePlayerState,
  evidenceId: EvidenceId,
  referenced: boolean,
): CaseTransitionResult {
  const evidenceError = requireAvailableEvidence(definition, state, evidenceId);
  if (evidenceError) return evidenceError;
  const alreadyReferenced = state.referencedEvidenceIds.includes(evidenceId);
  if (alreadyReferenced === referenced) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  const referencedEvidenceIds = referenced
    ? orderEvidenceIds(definition, [...state.referencedEvidenceIds, evidenceId])
    : state.referencedEvidenceIds.filter((id) => id !== evidenceId);

  return {
    ok: true,
    state: { ...state, turn, referencedEvidenceIds },
    events: [
      {
        type: 'evidence_reference_changed',
        turn,
        evidenceId,
        referenced,
      },
    ],
  };
}

function connectEvidence(
  definition: CaseDefinition,
  state: CasePlayerState,
  fromEvidenceId: EvidenceId,
  toEvidenceId: EvidenceId,
  kind: EvidenceConnectionKind,
): CaseTransitionResult {
  const fromError = requireAvailableEvidence(definition, state, fromEvidenceId);
  if (fromError) return fromError;
  const toError = requireAvailableEvidence(definition, state, toEvidenceId);
  if (toError) return toError;
  if (fromEvidenceId === toEvidenceId) {
    return failure(
      state,
      'INVALID_EVIDENCE_CONNECTION',
      'Evidence cannot be connected to itself.',
    );
  }

  const id = createEvidenceConnectionId(fromEvidenceId, toEvidenceId, kind);
  if (state.evidenceConnections.some((connection) => connection.id === id)) {
    return failure(
      state,
      'INVALID_EVIDENCE_CONNECTION',
      'That evidence connection already exists.',
    );
  }

  const turn = state.turn + 1;
  const connection = {
    id,
    fromEvidenceId,
    toEvidenceId,
    kind,
    createdOnTurn: turn,
  } as const;

  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceConnections: [...state.evidenceConnections, connection],
    },
    events: [
      {
        type: 'evidence_connected',
        turn,
        connectionId: id,
        fromEvidenceId,
        toEvidenceId,
        kind,
      },
    ],
  };
}

function disconnectEvidence(
  state: CasePlayerState,
  connectionId: string,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  if (!state.evidenceConnections.some((connection) => connection.id === connectionId)) {
    return failure(
      state,
      'UNKNOWN_EVIDENCE_CONNECTION',
      `Evidence connection "${connectionId}" does not exist.`,
    );
  }

  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceConnections: state.evidenceConnections.filter(
        (connection) => connection.id !== connectionId,
      ),
    },
    events: [{ type: 'evidence_disconnected', turn, connectionId }],
  };
}

function placeDiscoveredEvidenceOnBoard(
  definition: CaseDefinition,
  state: CasePlayerState,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  const missingEvidenceIds = definition.investigation.evidence
    .filter(
      (evidence) =>
        state.discoveredEvidenceIds.includes(evidence.id) &&
        !state.evidenceBoard.placements[evidence.id],
    )
    .map((evidence) => evidence.id);
  if (missingEvidenceIds.length === 0) {
    return { ok: true, state, events: [] };
  }

  const placements = { ...state.evidenceBoard.placements };
  definition.investigation.evidence.forEach((evidence, index) => {
    if (!missingEvidenceIds.includes(evidence.id)) return;
    placements[evidence.id] = createDefaultEvidenceBoardPlacement(
      evidence.id,
      index,
    );
  });
  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: { ...state.evidenceBoard, placements },
    },
    events: [
      {
        type: 'evidence_board_arranged',
        turn,
        evidenceIds: missingEvidenceIds,
      },
    ],
  };
}

function moveEvidenceOnBoard(
  definition: CaseDefinition,
  state: CasePlayerState,
  evidenceId: EvidenceId,
  x: number,
  y: number,
  rotation: number,
): CaseTransitionResult {
  const evidenceError = requireAvailableEvidence(definition, state, evidenceId);
  if (evidenceError) return evidenceError;
  if (!isFiniteEvidenceBoardTransform([x, y, rotation])) {
    return failure(
      state,
      'INVALID_EVIDENCE_BOARD_POSITION',
      'Evidence board coordinates and rotation must be finite numbers.',
    );
  }

  const previous = state.evidenceBoard.placements[evidenceId];
  const highestZ = Math.max(
    0,
    ...Object.values(state.evidenceBoard.placements).map(
      (placement) => placement.zIndex,
    ),
  );
  const placement = normalizeEvidenceBoardPlacement({
    evidenceId,
    x,
    y,
    rotation,
    zIndex: highestZ + 1,
  });
  if (
    previous &&
    previous.x === placement.x &&
    previous.y === placement.y &&
    previous.rotation === placement.rotation &&
    previous.zIndex === placement.zIndex
  ) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: {
        ...state.evidenceBoard,
        placements: {
          ...state.evidenceBoard.placements,
          [evidenceId]: placement,
        },
      },
    },
    events: [{ type: 'evidence_board_item_moved', turn, evidenceId }],
  };
}

function setEvidenceBoardViewport(
  state: CasePlayerState,
  x: number,
  y: number,
  scale: number,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  if (!isFiniteEvidenceBoardTransform([x, y, scale])) {
    return failure(
      state,
      'INVALID_EVIDENCE_BOARD_POSITION',
      'Evidence board viewport values must be finite numbers.',
    );
  }
  const viewport = normalizeEvidenceBoardViewport({ x, y, scale });
  const current = state.evidenceBoard.viewport;
  if (
    current.x === viewport.x &&
    current.y === viewport.y &&
    current.scale === viewport.scale
  ) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: { ...state.evidenceBoard, viewport },
    },
    events: [{ type: 'evidence_board_viewport_changed', turn }],
  };
}

function createEvidenceBoardGroup(
  definition: CaseDefinition,
  state: CasePlayerState,
  label: string,
  evidenceIds: readonly EvidenceId[],
): CaseTransitionResult {
  const selectionError = requireEvidenceBoardSelection(
    definition,
    state,
    evidenceIds,
  );
  if (selectionError) return selectionError;
  const normalizedIds = orderEvidenceIds(definition, [...new Set(evidenceIds)]);
  const turn = state.turn + 1;
  const groupId = `board-group-${turn}`;
  const group = {
    id: groupId,
    label: label.trim() || `GROUP ${state.evidenceBoard.groups.length + 1}`,
    evidenceIds: normalizedIds,
    createdOnTurn: turn,
  };
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: {
        ...state.evidenceBoard,
        groups: [
          ...state.evidenceBoard.groups.filter(
            (existing) =>
              !existing.evidenceIds.some((id) => normalizedIds.includes(id)),
          ),
          group,
        ],
      },
    },
    events: [
      {
        type: 'evidence_board_group_created',
        turn,
        groupId,
        evidenceIds: normalizedIds,
      },
    ],
  };
}

function deleteEvidenceBoardGroup(
  state: CasePlayerState,
  groupId: string,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  if (!state.evidenceBoard.groups.some((group) => group.id === groupId)) {
    return failure(
      state,
      'UNKNOWN_EVIDENCE_BOARD_GROUP',
      `Evidence board group "${groupId}" does not exist.`,
    );
  }
  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: {
        ...state.evidenceBoard,
        groups: state.evidenceBoard.groups.filter((group) => group.id !== groupId),
      },
    },
    events: [{ type: 'evidence_board_group_deleted', turn, groupId }],
  };
}

function createTheoryCluster(
  definition: CaseDefinition,
  state: CasePlayerState,
  title: string,
  evidenceIds: readonly EvidenceId[],
): CaseTransitionResult {
  const selectionError = requireEvidenceBoardSelection(
    definition,
    state,
    evidenceIds,
  );
  if (selectionError) return selectionError;
  const normalizedIds = orderEvidenceIds(definition, [...new Set(evidenceIds)]);
  const turn = state.turn + 1;
  const clusterId = `theory-cluster-${turn}`;
  const cluster = {
    id: clusterId,
    title:
      title.trim() || `THEORY ${state.evidenceBoard.theoryClusters.length + 1}`,
    evidenceIds: normalizedIds,
    createdOnTurn: turn,
  };
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: {
        ...state.evidenceBoard,
        theoryClusters: [...state.evidenceBoard.theoryClusters, cluster],
      },
    },
    events: [
      {
        type: 'theory_cluster_created',
        turn,
        clusterId,
        evidenceIds: normalizedIds,
      },
    ],
  };
}

function deleteTheoryCluster(
  state: CasePlayerState,
  clusterId: string,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  if (
    !state.evidenceBoard.theoryClusters.some(
      (cluster) => cluster.id === clusterId,
    )
  ) {
    return failure(
      state,
      'UNKNOWN_THEORY_CLUSTER',
      `Theory cluster "${clusterId}" does not exist.`,
    );
  }
  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      evidenceBoard: {
        ...state.evidenceBoard,
        theoryClusters: state.evidenceBoard.theoryClusters.filter(
          (cluster) => cluster.id !== clusterId,
        ),
      },
    },
    events: [{ type: 'theory_cluster_deleted', turn, clusterId }],
  };
}

function requireEvidenceBoardSelection(
  definition: CaseDefinition,
  state: CasePlayerState,
  evidenceIds: readonly EvidenceId[],
): CaseTransitionResult | null {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  const uniqueIds = [...new Set(evidenceIds)];
  const valid =
    uniqueIds.length === evidenceIds.length &&
    uniqueIds.length >= 2 &&
    uniqueIds.every(
      (evidenceId) =>
        state.discoveredEvidenceIds.includes(evidenceId) &&
        definition.investigation.evidence.some(
          (evidence) => evidence.id === evidenceId,
        ),
    );
  return valid
    ? null
    : failure(
        state,
        'INVALID_EVIDENCE_BOARD_SELECTION',
        'Board groups and theory clusters require at least two unique discovered evidence items.',
      );
}

function openInternetPage(
  definition: CaseDefinition,
  state: CasePlayerState,
  location: FictionalInternetLocation,
): CaseTransitionResult {
  const locationError = requireAvailableInternetLocation(definition, state, location);
  if (locationError) return locationError;
  const current = state.fictionalInternet.currentLocation;
  if (
    current?.siteId === location.siteId &&
    current.pageId === location.pageId
  ) {
    return { ok: true, state, events: [] };
  }

  const history = [
    ...state.fictionalInternet.history.slice(
      0,
      state.fictionalInternet.historyIndex + 1,
    ),
    location,
  ];
  return commitInternetLocation(definition, state, location, history, history.length - 1, 'new');
}

function moveInternetHistory(
  definition: CaseDefinition,
  state: CasePlayerState,
  direction: 'back' | 'forward',
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  const nextIndex =
    state.fictionalInternet.historyIndex + (direction === 'back' ? -1 : 1);
  const location = state.fictionalInternet.history[nextIndex];
  if (!location) {
    return failure(
      state,
      'INTERNET_HISTORY_UNAVAILABLE',
      `No ${direction} page is available in the local case history.`,
    );
  }
  return commitInternetLocation(
    definition,
    state,
    location,
    state.fictionalInternet.history,
    nextIndex,
    direction,
  );
}

function setInternetPageBookmarked(
  definition: CaseDefinition,
  state: CasePlayerState,
  location: FictionalInternetLocation,
  bookmarked: boolean,
): CaseTransitionResult {
  const locationError = requireAvailableInternetLocation(definition, state, location);
  if (locationError) return locationError;
  const key = createFictionalPageKey(location.siteId, location.pageId);
  const alreadyBookmarked = state.fictionalInternet.bookmarkedPageKeys.includes(key);
  if (alreadyBookmarked === bookmarked) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  const bookmarkedPageKeys = bookmarked
    ? [...state.fictionalInternet.bookmarkedPageKeys, key]
    : state.fictionalInternet.bookmarkedPageKeys.filter((item) => item !== key);

  return {
    ok: true,
    state: {
      ...state,
      turn,
      fictionalInternet: {
        ...state.fictionalInternet,
        bookmarkedPageKeys,
      },
    },
    events: [
      {
        type: 'internet_bookmark_changed',
        turn,
        siteId: location.siteId,
        pageId: location.pageId,
        bookmarked,
      },
    ],
  };
}

function commitInternetLocation(
  definition: CaseDefinition,
  state: CasePlayerState,
  location: FictionalInternetLocation,
  history: readonly FictionalInternetLocation[],
  historyIndex: number,
  direction: 'new' | 'back' | 'forward',
): CaseTransitionResult {
  const page = getFictionalPage(definition, location)!;
  const turn = state.turn + 1;
  const key = createFictionalPageKey(location.siteId, location.pageId);
  const newlyDiscovered = page.revealsEvidenceIds.filter(
    (evidenceId) => !state.discoveredEvidenceIds.includes(evidenceId),
  );

  return {
    ok: true,
    state: {
      ...state,
      turn,
      discoveredEvidenceIds: orderEvidenceIds(definition, [
        ...state.discoveredEvidenceIds,
        ...newlyDiscovered,
      ]),
      fictionalInternet: {
        ...state.fictionalInternet,
        currentLocation: location,
        history,
        historyIndex,
        visitedPageKeys: appendUnique(
          state.fictionalInternet.visitedPageKeys,
          key,
        ),
      },
    },
    events: [
      {
        type: 'internet_page_opened',
        turn,
        siteId: location.siteId,
        pageId: location.pageId,
        direction,
      },
      ...newlyDiscovered.map(
        (evidenceId) =>
          ({
            type: 'evidence_discovered',
            turn,
            evidenceId,
          }) as const,
      ),
    ],
  };
}

function requireAvailableInternetLocation(
  definition: CaseDefinition,
  state: CasePlayerState,
  location: FictionalInternetLocation,
): CaseTransitionResult | null {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  const site = getFictionalSite(definition, location.siteId);
  if (!site) {
    return failure(
      state,
      'UNKNOWN_FICTIONAL_SITE',
      `Fictional site "${location.siteId}" does not exist.`,
    );
  }
  if (!isConditionMet(site.openWhen, state)) {
    return failure(
      state,
      'FICTIONAL_SITE_LOCKED',
      `Fictional site "${location.siteId}" is not available.`,
    );
  }
  if (!site.pages.some((page) => page.id === location.pageId)) {
    return failure(
      state,
      'UNKNOWN_FICTIONAL_PAGE',
      `Fictional page "${location.pageId}" does not exist on site "${location.siteId}".`,
    );
  }
  return null;
}

function submitDeduction(
  definition: CaseDefinition,
  state: CasePlayerState,
  deductionId: DeductionId,
  submittedEvidenceIds: readonly EvidenceId[],
): CaseTransitionResult {
  const phaseError = requireInvestigation(state);
  if (phaseError) return phaseError;

  const deduction = definition.investigation.deductions.find(
    (item) => item.id === deductionId,
  );
  if (!deduction) {
    return failure(
      state,
      'UNKNOWN_DEDUCTION',
      `Deduction "${deductionId}" does not exist.`,
    );
  }
  if (!isConditionMet(deduction.openWhen, state)) {
    return failure(
      state,
      'DEDUCTION_LOCKED',
      `Deduction "${deductionId}" is not available.`,
    );
  }

  const uniqueSubmitted = [...new Set(submittedEvidenceIds)];
  const selectionIsValid =
    uniqueSubmitted.length === submittedEvidenceIds.length &&
    uniqueSubmitted.length >= deduction.minimumEvidence &&
    uniqueSubmitted.length <= deduction.maximumEvidence &&
    uniqueSubmitted.every(
      (id) =>
        state.discoveredEvidenceIds.includes(id) &&
        definition.investigation.evidence.some((item) => item.id === id),
    );

  if (!selectionIsValid) {
    return failure(
      state,
      'INVALID_EVIDENCE_SELECTION',
      'Deduction evidence must be unique, discovered, and within the authored selection range.',
    );
  }

  const normalizedSelection = orderEvidenceIds(definition, uniqueSubmitted);
  const canonical = orderEvidenceIds(
    definition,
    definition.canonicalTruth.deductionSolutions[deductionId]!.requiredEvidenceIds,
  );
  const correct = equalStringArrays(normalizedSelection, canonical);
  const turn = state.turn + 1;
  const previousAttempts = state.deductionAttempts[deductionId] ?? [];

  const nextState: CasePlayerState = {
    ...state,
    turn,
    theoryEvidenceIds: orderEvidenceIds(definition, [
      ...state.theoryEvidenceIds,
      ...normalizedSelection,
    ]),
    solvedDeductionIds: correct
      ? appendUnique(state.solvedDeductionIds, deductionId)
      : state.solvedDeductionIds,
    deductionAttempts: {
      ...state.deductionAttempts,
      [deductionId]: [
        ...previousAttempts,
        { turn, selectedEvidenceIds: normalizedSelection, correct },
      ],
    },
  };

  return {
    ok: true,
    state: nextState,
    events: [
      { type: 'deduction_evaluated', turn, deductionId, correct },
    ],
  };
}

function submitAccusation(
  definition: CaseDefinition,
  state: CasePlayerState,
  submittedAnswers: Readonly<Record<QuestionId, OptionId>>,
): CaseTransitionResult {
  const phaseError = requireInvestigation(state);
  if (phaseError) return phaseError;
  if (!isAccusationAvailable(definition, state)) {
    return failure(state, 'ACCUSATION_LOCKED', 'The accusation is not available.');
  }

  const questions = definition.investigation.accusation.questions;
  const submittedKeys = Object.keys(submittedAnswers);
  const validAnswers =
    submittedKeys.length === questions.length &&
    questions.every((question) => {
      const answer = submittedAnswers[question.id];
      return Boolean(answer) && question.options.some((option) => option.id === answer);
    });

  if (!validAnswers) {
    return failure(
      state,
      'INVALID_ACCUSATION',
      'The accusation must answer every authored question with a valid option.',
    );
  }

  const answers = Object.fromEntries(
    questions.map((question) => [question.id, submittedAnswers[question.id]]),
  ) as Record<QuestionId, OptionId>;
  const answersAreCorrect = questions.every(
    (question) =>
      answers[question.id] ===
      definition.canonicalTruth.accusationAnswers[question.id],
  );
  const requiredDeductionsSolved =
    definition.canonicalTruth.requiredDeductionIds.every((id) =>
      state.solvedDeductionIds.includes(id),
    );
  const correct = answersAreCorrect && requiredDeductionsSolved;
  const turn = state.turn + 1;
  const accusationAttempts = [
    ...state.accusationAttempts,
    { turn, answers, correct },
  ];
  const score = correct
    ? calculateScore(definition, {
        ...state,
        accusationAttempts,
      })
    : null;

  const nextState: CasePlayerState = {
    ...state,
    turn,
    accusationAttempts,
    phase: correct ? 'resolved' : 'investigating',
    resolution: correct
      ? { correct: true, score: score!, resolvedOnTurn: turn }
      : null,
  };

  return {
    ok: true,
    state: nextState,
    events: [
      { type: 'accusation_evaluated', turn, correct },
      ...(correct
        ? ([{ type: 'case_resolved', turn, score: score! }] as const)
        : []),
    ],
  };
}

export const EVIDENCE_NOTE_MAX_LENGTH = 1200;

function setEvidenceNote(
  definition: CaseDefinition,
  state: CasePlayerState,
  evidenceId: EvidenceId,
  text: string,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;

  const exists = definition.investigation.evidence.some(
    (item) => item.id === evidenceId,
  );
  if (!exists) {
    return failure(state, 'UNKNOWN_EVIDENCE', `Evidence "${evidenceId}" does not exist.`);
  }
  if (!state.discoveredEvidenceIds.includes(evidenceId)) {
    return failure(
      state,
      'EVIDENCE_NOT_DISCOVERED',
      'Only discovered evidence can be annotated.',
    );
  }
  if (text.length > EVIDENCE_NOTE_MAX_LENGTH) {
    return failure(
      state,
      'NOTE_TOO_LONG',
      `Notes are limited to ${EVIDENCE_NOTE_MAX_LENGTH} characters.`,
    );
  }

  const trimmed = text.trim();
  const existing = state.evidenceNotes[evidenceId];
  if ((existing?.text ?? '') === trimmed) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  const nextNotes = { ...state.evidenceNotes };
  if (trimmed.length === 0) delete nextNotes[evidenceId];
  else nextNotes[evidenceId] = { evidenceId, text: trimmed, updatedOnTurn: turn };

  return {
    ok: true,
    state: { ...state, turn, evidenceNotes: nextNotes },
    events: [
      {
        type: 'evidence_note_saved',
        turn,
        evidenceId,
        cleared: trimmed.length === 0,
      },
    ],
  };
}

function setTimelineEventPinned(
  definition: CaseDefinition,
  state: CasePlayerState,
  timelineEventId: TimelineEventId,
  pinned: boolean,
): CaseTransitionResult {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;

  const event = definition.investigation.timeline.find(
    (item) => item.id === timelineEventId,
  );
  if (!event) {
    return failure(
      state,
      'UNKNOWN_TIMELINE_EVENT',
      `Timeline event "${timelineEventId}" does not exist.`,
    );
  }
  const sourced = event.sourceEvidenceIds.some((evidenceId) =>
    state.discoveredEvidenceIds.includes(evidenceId),
  );
  if (!sourced || (event.openWhen && !isConditionMet(event.openWhen, state))) {
    return failure(
      state,
      'TIMELINE_EVENT_LOCKED',
      `Timeline event "${timelineEventId}" has not been verified yet.`,
    );
  }

  const alreadyPinned = state.pinnedTimelineEventIds.includes(timelineEventId);
  if (alreadyPinned === pinned) return { ok: true, state, events: [] };

  const turn = state.turn + 1;
  const pinnedTimelineEventIds = pinned
    ? definition.investigation.timeline
        .filter(
          (item) =>
            item.id === timelineEventId ||
            state.pinnedTimelineEventIds.includes(item.id),
        )
        .map((item) => item.id)
    : state.pinnedTimelineEventIds.filter((id) => id !== timelineEventId);

  return {
    ok: true,
    state: { ...state, turn, pinnedTimelineEventIds },
    events: [{ type: 'timeline_event_pinned', turn, timelineEventId, pinned }],
  };
}

function spendHint(
  definition: CaseDefinition,
  state: CasePlayerState,
  deductionId: DeductionId,
): CaseTransitionResult {
  const phaseError = requireInvestigation(state);
  if (phaseError) return phaseError;

  const deduction = definition.investigation.deductions.find(
    (item) => item.id === deductionId,
  );
  if (!deduction) {
    return failure(
      state,
      'UNKNOWN_DEDUCTION',
      `Deduction "${deductionId}" does not exist.`,
    );
  }
  if (!deduction.hint || !isConditionMet(deduction.openWhen, state)) {
    return failure(
      state,
      'HINT_UNAVAILABLE',
      `No hint is available for "${deductionId}" yet.`,
    );
  }
  if (state.hintsUsed.some((usage) => usage.deductionId === deductionId)) {
    return { ok: true, state, events: [] };
  }

  const turn = state.turn + 1;
  return {
    ok: true,
    state: {
      ...state,
      turn,
      hintsUsed: [...state.hintsUsed, { deductionId, turn }],
    },
    events: [{ type: 'hint_used', turn, deductionId }],
  };
}

function calculateScore(
  definition: CaseDefinition,
  state: Pick<
    CasePlayerState,
    'deductionAttempts' | 'accusationAttempts' | 'hintsUsed'
  >,
) {
  const incorrectDeductions = Object.values(state.deductionAttempts)
    .flat()
    .filter((attempt) => !attempt.correct).length;
  const incorrectAccusations = state.accusationAttempts.filter(
    (attempt) => !attempt.correct,
  ).length;

  return Math.max(
    0,
    definition.scoring.maximumScore -
      incorrectDeductions * definition.scoring.incorrectDeductionPenalty -
      incorrectAccusations * definition.scoring.incorrectAccusationPenalty -
      state.hintsUsed.length * (definition.scoring.hintPenalty ?? 0),
  );
}

function requireInvestigation(
  state: CasePlayerState,
): CaseTransitionResult | null {
  return state.phase === 'investigating'
    ? null
    : failure(state, 'INVALID_PHASE', 'Begin the investigation first.');
}

function requireEvidencePhase(
  state: CasePlayerState,
): CaseTransitionResult | null {
  return state.phase === 'briefing'
    ? failure(state, 'INVALID_PHASE', 'Begin the investigation first.')
    : null;
}

function requireAvailableEvidence(
  definition: CaseDefinition,
  state: CasePlayerState,
  evidenceId: EvidenceId,
): CaseTransitionResult | null {
  const phaseError = requireEvidencePhase(state);
  if (phaseError) return phaseError;
  if (!definition.investigation.evidence.some((item) => item.id === evidenceId)) {
    return failure(
      state,
      'UNKNOWN_EVIDENCE',
      `Evidence "${evidenceId}" does not exist.`,
    );
  }
  if (!state.discoveredEvidenceIds.includes(evidenceId)) {
    return failure(
      state,
      'EVIDENCE_NOT_DISCOVERED',
      `Evidence "${evidenceId}" has not been discovered.`,
    );
  }
  return null;
}

export function createEvidenceConnectionId(
  fromEvidenceId: EvidenceId,
  toEvidenceId: EvidenceId,
  kind: EvidenceConnectionKind,
) {
  return `connection:${encodeURIComponent(fromEvidenceId)}:${kind}:${encodeURIComponent(toEvidenceId)}`;
}

function failure(
  state: CasePlayerState,
  code: CaseEngineError['code'],
  message: string,
): CaseTransitionResult {
  return { ok: false, state, events: [], error: { code, message } };
}

function appendUnique<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}

function orderEvidenceIds(
  definition: CaseDefinition,
  ids: readonly EvidenceId[],
): readonly EvidenceId[] {
  const selected = new Set(ids);
  return definition.investigation.evidence
    .map((item) => item.id)
    .filter((id) => selected.has(id));
}

function equalStringArrays(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
