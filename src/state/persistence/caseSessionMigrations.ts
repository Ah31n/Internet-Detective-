import {
  createEmptyEvidenceBoardState,
  type CasePlayerState,
} from '@/case-engine';

/**
 * Save-format migrations and defensive repair.
 *
 * A save is never silently erased. Unreadable case entries are dropped
 * individually and reported, while every repairable field is preserved.
 */

export const CASE_SESSION_STORE_VERSION = 5;

export interface CaseProgressMeta {
  caseId: string;
  startedAtEpochMs: number | null;
  lastOpenedAtEpochMs: number | null;
  investigationDurationMs: number;
  /** Route within the case the player last had open. */
  lastScreen: string | null;
  /** Evidence that was open when the app was interrupted. */
  openEvidenceId: string | null;
  completed: boolean;
  completedAtEpochMs: number | null;
  score: number | null;
}

export interface PersistedCaseSessions {
  activeCaseId: string | null;
  sessions: Readonly<Record<string, CasePlayerState>>;
  progress: Readonly<Record<string, CaseProgressMeta>>;
}

const emptyFictionalInternetState = {
  currentLocation: null,
  history: [],
  historyIndex: -1,
  visitedPageKeys: [],
  bookmarkedPageKeys: [],
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const objectArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const finiteNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Repairs one persisted session, or returns null when it is unusable. */
export function sanitizeCaseSession(value: unknown): CasePlayerState | null {
  if (!isRecord(value)) return null;
  if (typeof value.caseId !== 'string' || value.caseId.length === 0) return null;

  const phase =
    value.phase === 'briefing' || value.phase === 'investigating' || value.phase === 'resolved'
      ? value.phase
      : 'briefing';

  const board = isRecord(value.evidenceBoard) ? value.evidenceBoard : {};
  const boardViewport = isRecord(board.viewport) ? board.viewport : {};
  const placements = isRecord(board.placements) ? board.placements : {};
  const internet = isRecord(value.fictionalInternet) ? value.fictionalInternet : {};
  const notes = isRecord(value.evidenceNotes) ? value.evidenceNotes : {};
  const resolution = isRecord(value.resolution) ? value.resolution : null;
  const deductionAttempts = isRecord(value.deductionAttempts)
    ? value.deductionAttempts
    : {};

  return {
    caseId: value.caseId,
    contentVersion: finiteNumber(value.contentVersion, 1),
    phase,
    turn: Math.max(0, Math.round(finiteNumber(value.turn, 0))),
    currentSceneId: typeof value.currentSceneId === 'string' ? value.currentSceneId : null,
    visitedSceneIds: stringArray(value.visitedSceneIds),
    discoveredEvidenceIds: stringArray(value.discoveredEvidenceIds),
    viewedEvidenceIds: stringArray(value.viewedEvidenceIds),
    referencedEvidenceIds: stringArray(value.referencedEvidenceIds),
    evidenceConnections: objectArray(value.evidenceConnections)
      .filter(
        (connection) =>
          typeof connection.id === 'string' &&
          typeof connection.fromEvidenceId === 'string' &&
          typeof connection.toEvidenceId === 'string',
      )
      .map((connection) => ({
        id: connection.id as string,
        fromEvidenceId: connection.fromEvidenceId as string,
        toEvidenceId: connection.toEvidenceId as string,
        kind: (connection.kind === 'supports' ||
        connection.kind === 'contradicts' ||
        connection.kind === 'sequence'
          ? connection.kind
          : 'related') as CasePlayerState['evidenceConnections'][number]['kind'],
        createdOnTurn: Math.max(0, Math.round(finiteNumber(connection.createdOnTurn, 0))),
      })),
    evidenceNotes: Object.fromEntries(
      Object.entries(notes)
        .filter(
          ([evidenceId, note]) =>
            typeof evidenceId === 'string' && isRecord(note) && typeof note.text === 'string',
        )
        .map(([evidenceId, note]) => {
          const record = note as Record<string, unknown>;
          return [
            evidenceId,
            {
              evidenceId,
              text: String(record.text).slice(0, 1200),
              updatedOnTurn: Math.max(0, Math.round(finiteNumber(record.updatedOnTurn, 0))),
            },
          ];
        }),
    ),
    theoryEvidenceIds: stringArray(value.theoryEvidenceIds),
    pinnedTimelineEventIds: stringArray(value.pinnedTimelineEventIds),
    hintsUsed: objectArray(value.hintsUsed)
      .filter((usage) => typeof usage.deductionId === 'string')
      .map((usage) => ({
        deductionId: usage.deductionId as string,
        turn: Math.max(0, Math.round(finiteNumber(usage.turn, 0))),
      })),
    evidenceBoard: {
      placements: Object.fromEntries(
        Object.entries(placements)
          .filter(([, placement]) => isRecord(placement))
          .map(([evidenceId, placement]) => {
            const record = placement as Record<string, unknown>;
            return [
              evidenceId,
              {
                evidenceId,
                x: finiteNumber(record.x, 0),
                y: finiteNumber(record.y, 0),
                rotation: finiteNumber(record.rotation, 0),
                zIndex: Math.round(finiteNumber(record.zIndex, 0)),
              },
            ];
          }),
      ),
      viewport: {
        x: finiteNumber(boardViewport.x, 24),
        y: finiteNumber(boardViewport.y, 24),
        scale: finiteNumber(boardViewport.scale, 0.82),
      },
      groups: objectArray(board.groups)
        .filter((group) => typeof group.id === 'string')
        .map((group) => ({
          id: group.id as string,
          label: typeof group.label === 'string' ? group.label : 'GROUP',
          evidenceIds: stringArray(group.evidenceIds),
          createdOnTurn: Math.max(0, Math.round(finiteNumber(group.createdOnTurn, 0))),
        })),
      theoryClusters: objectArray(board.theoryClusters)
        .filter((cluster) => typeof cluster.id === 'string')
        .map((cluster) => ({
          id: cluster.id as string,
          title: typeof cluster.title === 'string' ? cluster.title : 'THEORY',
          evidenceIds: stringArray(cluster.evidenceIds),
          createdOnTurn: Math.max(0, Math.round(finiteNumber(cluster.createdOnTurn, 0))),
        })),
    },
    fictionalInternet: {
      currentLocation: isRecord(internet.currentLocation)
        ? {
            siteId: String(internet.currentLocation.siteId ?? ''),
            pageId: String(internet.currentLocation.pageId ?? ''),
          }
        : null,
      history: objectArray(internet.history).map((entry) => ({
        siteId: String(entry.siteId ?? ''),
        pageId: String(entry.pageId ?? ''),
      })),
      historyIndex: Math.round(finiteNumber(internet.historyIndex, -1)),
      visitedPageKeys: stringArray(internet.visitedPageKeys),
      bookmarkedPageKeys: stringArray(internet.bookmarkedPageKeys),
    },
    solvedDeductionIds: stringArray(value.solvedDeductionIds),
    deductionAttempts: Object.fromEntries(
      Object.entries(deductionAttempts).map(([deductionId, attempts]) => [
        deductionId,
        objectArray(attempts).map((attempt) => ({
          turn: Math.max(0, Math.round(finiteNumber(attempt.turn, 0))),
          selectedEvidenceIds: stringArray(attempt.selectedEvidenceIds),
          correct: attempt.correct === true,
        })),
      ]),
    ),
    accusationAttempts: objectArray(value.accusationAttempts).map((attempt) => ({
      turn: Math.max(0, Math.round(finiteNumber(attempt.turn, 0))),
      answers: isRecord(attempt.answers)
        ? (Object.fromEntries(
            Object.entries(attempt.answers).filter(
              ([, option]) => typeof option === 'string',
            ),
          ) as Record<string, string>)
        : {},
      correct: attempt.correct === true,
    })),
    resolution:
      resolution && resolution.correct === true
        ? {
            correct: true,
            score: Math.max(0, Math.round(finiteNumber(resolution.score, 0))),
            resolvedOnTurn: Math.max(
              0,
              Math.round(finiteNumber(resolution.resolvedOnTurn, 0)),
            ),
          }
        : null,
  };
}

function sanitizeProgressMeta(caseId: string, value: unknown): CaseProgressMeta {
  const record = isRecord(value) ? value : {};
  return {
    caseId,
    startedAtEpochMs:
      typeof record.startedAtEpochMs === 'number' ? record.startedAtEpochMs : null,
    lastOpenedAtEpochMs:
      typeof record.lastOpenedAtEpochMs === 'number' ? record.lastOpenedAtEpochMs : null,
    investigationDurationMs: Math.max(
      0,
      Math.round(finiteNumber(record.investigationDurationMs, 0)),
    ),
    lastScreen: typeof record.lastScreen === 'string' ? record.lastScreen : null,
    openEvidenceId:
      typeof record.openEvidenceId === 'string' ? record.openEvidenceId : null,
    completed: record.completed === true,
    completedAtEpochMs:
      typeof record.completedAtEpochMs === 'number' ? record.completedAtEpochMs : null,
    score: typeof record.score === 'number' ? record.score : null,
  };
}

export interface SanitizedCaseSessions {
  value: PersistedCaseSessions;
  droppedCaseIds: readonly string[];
}

/** Repairs a persisted payload of unknown shape without discarding good data. */
export function sanitizeCaseSessions(persisted: unknown): SanitizedCaseSessions {
  if (!isRecord(persisted)) {
    return {
      value: { activeCaseId: null, sessions: {}, progress: {} },
      droppedCaseIds: [],
    };
  }

  const rawSessions = isRecord(persisted.sessions) ? persisted.sessions : {};
  const rawProgress = isRecord(persisted.progress) ? persisted.progress : {};
  const sessions: Record<string, CasePlayerState> = {};
  const droppedCaseIds: string[] = [];

  for (const [caseId, session] of Object.entries(rawSessions)) {
    const repaired = sanitizeCaseSession(session);
    if (repaired) sessions[caseId] = { ...repaired, caseId };
    else droppedCaseIds.push(caseId);
  }

  const progress: Record<string, CaseProgressMeta> = {};
  for (const caseId of new Set([...Object.keys(sessions), ...Object.keys(rawProgress)])) {
    if (!sessions[caseId]) continue;
    progress[caseId] = sanitizeProgressMeta(caseId, rawProgress[caseId]);
  }

  const activeCaseId =
    typeof persisted.activeCaseId === 'string' && sessions[persisted.activeCaseId]
      ? persisted.activeCaseId
      : null;

  return { value: { activeCaseId, sessions, progress }, droppedCaseIds };
}

/** Upgrades older save formats before sanitisation. */
export function migrateCaseSessions(
  persisted: unknown,
  version: number,
): PersistedCaseSessions {
  const source = isRecord(persisted) ? persisted : {};
  const rawSessions = isRecord(source.sessions) ? source.sessions : {};
  const activeCaseId =
    typeof source.activeCaseId === 'string' ? source.activeCaseId : null;

  const upgraded = Object.fromEntries(
    Object.entries(rawSessions).map(([caseId, session]) => {
      const record = isRecord(session) ? { ...session } : {};

      if (version < 2) {
        const inspected = stringArray(record.inspectedEvidenceIds);
        delete record.inspectedEvidenceIds;
        record.viewedEvidenceIds = record.viewedEvidenceIds ?? inspected;
        record.referencedEvidenceIds = record.referencedEvidenceIds ?? [];
        record.evidenceConnections = record.evidenceConnections ?? [];
        record.theoryEvidenceIds = record.theoryEvidenceIds ?? [];
      }
      if (version < 3) {
        record.fictionalInternet = record.fictionalInternet ?? emptyFictionalInternetState;
      }
      if (version < 4) {
        record.evidenceBoard = record.evidenceBoard ?? createEmptyEvidenceBoardState();
      }
      if (version < 5) {
        // Phase 10 additions: notes, pinned timeline events, hint usage.
        record.evidenceNotes = record.evidenceNotes ?? {};
        record.pinnedTimelineEventIds = record.pinnedTimelineEventIds ?? [];
        record.hintsUsed = record.hintsUsed ?? [];
      }

      return [caseId, record];
    }),
  );

  return sanitizeCaseSessions({
    activeCaseId,
    sessions: upgraded,
    progress: isRecord(source.progress) ? source.progress : {},
  }).value;
}
