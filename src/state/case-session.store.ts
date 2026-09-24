import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  type CaseAction,
  type CaseDefinition,
  type CasePlayerState,
  type CaseTransitionResult,
  createEmptyEvidenceBoardState,
  createInitialCasePlayerState,
  transitionCase,
} from '@/case-engine';

import { autosaveStorage } from './persistence/autosaveStorage';
import {
  CASE_SESSION_STORE_VERSION,
  migrateCaseSessions,
  sanitizeCaseSessions,
  type CaseProgressMeta,
  type PersistedCaseSessions,
} from './persistence/caseSessionMigrations';

export type { CaseProgressMeta } from './persistence/caseSessionMigrations';

interface CaseSessionState {
  activeCaseId: string | null;
  sessions: Readonly<Record<string, CasePlayerState>>;
  progress: Readonly<Record<string, CaseProgressMeta>>;
  hasHydrated: boolean;
  /** Ids dropped during recovery because they could not be repaired. */
  recoveredCaseIds: readonly string[];
}

interface CaseSessionActions {
  markHydrated: () => void;
  activateCase: (definition: CaseDefinition) => void;
  dispatchCaseAction: (
    definition: CaseDefinition,
    action: CaseAction,
  ) => CaseTransitionResult;
  setLastScreen: (caseId: string, screen: string) => void;
  setOpenEvidence: (caseId: string, evidenceId: string | null) => void;
  accumulatePlayTime: (caseId: string, elapsedMs: number) => void;
  clearCase: (caseId: string) => void;
  resetCaseSessions: () => void;
  /** Developer tooling. Never reachable from a production build. */
  devAddAllEvidence: (definition: CaseDefinition) => void;
  devUnlockAllEvidence: (definition: CaseDefinition) => void;
  devCompleteCase: (definition: CaseDefinition) => void;
  devResetBoard: (caseId: string) => void;
}

export type CaseSessionStore = CaseSessionState & CaseSessionActions;

export const CASE_SESSION_STORAGE_KEY = 'internet-detective.case-sessions';

type CaseTransitionListener = (
  definition: CaseDefinition,
  previous: CasePlayerState,
  next: CasePlayerState,
  action: CaseAction,
) => void;

let transitionListener: CaseTransitionListener | null = null;

/**
 * Registers an observer for successful engine transitions. Used by the
 * presentation layer for haptics and acknowledgement banners; the store and
 * the engine stay free of any UI or native dependency.
 */
export function setCaseTransitionListener(listener: CaseTransitionListener) {
  transitionListener = listener;
  return () => {
    if (transitionListener === listener) transitionListener = null;
  };
}

const initialPersistedState: PersistedCaseSessions = {
  activeCaseId: null,
  sessions: {},
  progress: {},
};

function createProgressMeta(caseId: string, nowMs: number): CaseProgressMeta {
  return {
    caseId,
    startedAtEpochMs: nowMs,
    lastOpenedAtEpochMs: nowMs,
    investigationDurationMs: 0,
    lastScreen: null,
    openEvidenceId: null,
    completed: false,
    completedAtEpochMs: null,
    score: null,
  };
}

function touchProgress(
  progress: Readonly<Record<string, CaseProgressMeta>>,
  caseId: string,
  patch: Partial<CaseProgressMeta>,
): Readonly<Record<string, CaseProgressMeta>> {
  const nowMs = Date.now();
  const existing = progress[caseId] ?? createProgressMeta(caseId, nowMs);
  return {
    ...progress,
    [caseId]: { ...existing, lastOpenedAtEpochMs: nowMs, ...patch },
  };
}

export const useCaseSessionStore = create<CaseSessionStore>()(
  persist<CaseSessionStore, [], [], PersistedCaseSessions>(
    (set, get) => ({
      ...initialPersistedState,
      hasHydrated: false,
      recoveredCaseIds: [],

      markHydrated: () => set({ hasHydrated: true }),

      activateCase: (definition) =>
        set((state) => ({
          activeCaseId: definition.id,
          sessions: state.sessions[definition.id]
            ? state.sessions
            : {
                ...state.sessions,
                [definition.id]: createInitialCasePlayerState(definition),
              },
          progress: touchProgress(state.progress, definition.id, {}),
        })),

      dispatchCaseAction: (definition, action) => {
        const current =
          get().sessions[definition.id] ?? createInitialCasePlayerState(definition);
        const result = transitionCase(definition, current, action);

        if (result.ok && result.state !== current) {
          set((state) => ({
            activeCaseId: definition.id,
            sessions: {
              ...state.sessions,
              [definition.id]: result.state,
            },
            progress: touchProgress(state.progress, definition.id, {
              completed: result.state.resolution !== null,
              completedAtEpochMs: result.state.resolution
                ? (state.progress[definition.id]?.completedAtEpochMs ?? Date.now())
                : null,
              score: result.state.resolution?.score ?? null,
              openEvidenceId:
                action.type === 'VIEW_EVIDENCE'
                  ? action.evidenceId
                  : (state.progress[definition.id]?.openEvidenceId ?? null),
            }),
          }));

          transitionListener?.(definition, current, result.state, action);
        }

        return result;
      },

      setLastScreen: (caseId, screen) =>
        set((state) =>
          state.progress[caseId]?.lastScreen === screen
            ? state
            : { progress: touchProgress(state.progress, caseId, { lastScreen: screen }) },
        ),

      setOpenEvidence: (caseId, evidenceId) =>
        set((state) =>
          state.progress[caseId]?.openEvidenceId === evidenceId
            ? state
            : {
                progress: touchProgress(state.progress, caseId, {
                  openEvidenceId: evidenceId,
                }),
              },
        ),

      accumulatePlayTime: (caseId, elapsedMs) =>
        set((state) => {
          if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return state;
          const existing =
            state.progress[caseId] ?? createProgressMeta(caseId, Date.now());
          return {
            progress: {
              ...state.progress,
              [caseId]: {
                ...existing,
                lastOpenedAtEpochMs: Date.now(),
                investigationDurationMs: Math.round(
                  existing.investigationDurationMs + elapsedMs,
                ),
              },
            },
          };
        }),

      clearCase: (caseId) =>
        set((state) => {
          const { [caseId]: _session, ...sessions } = state.sessions;
          const { [caseId]: _meta, ...progress } = state.progress;
          return {
            activeCaseId: state.activeCaseId === caseId ? null : state.activeCaseId,
            sessions,
            progress,
          };
        }),

      resetCaseSessions: () => set({ ...initialPersistedState, recoveredCaseIds: [] }),

      /**
       * QA: put every artifact in the inventory and nothing else.
       *
       * Deliberately distinct from `devUnlockAllEvidence`: this is the state a
       * tester wants when checking the evidence index, the board at full load,
       * or a viewer for an artifact that is hard to reach — scenes stay
       * unvisited and nothing is marked as read.
       */
      devAddAllEvidence: (definition) =>
        set((state) => {
          const current =
            state.sessions[definition.id] ?? createInitialCasePlayerState(definition);
          return {
            activeCaseId: definition.id,
            sessions: {
              ...state.sessions,
              [definition.id]: {
                ...current,
                phase: current.phase === 'briefing' ? 'investigating' : current.phase,
                currentSceneId:
                  current.currentSceneId ?? definition.investigation.startingSceneId,
                discoveredEvidenceIds: definition.investigation.evidence.map(
                  (item) => item.id,
                ),
              },
            },
          };
        }),

      /** QA: full access — every scene entered, every artifact found and read. */
      devUnlockAllEvidence: (definition) =>
        set((state) => {
          const current =
            state.sessions[definition.id] ?? createInitialCasePlayerState(definition);
          const everyEvidenceId = definition.investigation.evidence.map(
            (item) => item.id,
          );
          return {
            activeCaseId: definition.id,
            sessions: {
              ...state.sessions,
              [definition.id]: {
                ...current,
                phase: current.phase === 'briefing' ? 'investigating' : current.phase,
                currentSceneId:
                  current.currentSceneId ?? definition.investigation.startingSceneId,
                visitedSceneIds: definition.investigation.scenes.map((scene) => scene.id),
                discoveredEvidenceIds: everyEvidenceId,
                viewedEvidenceIds: everyEvidenceId,
              },
            },
          };
        }),

      devCompleteCase: (definition) =>
        set((state) => {
          const current =
            state.sessions[definition.id] ?? createInitialCasePlayerState(definition);
          const turn = current.turn + 1;
          return {
            activeCaseId: definition.id,
            sessions: {
              ...state.sessions,
              [definition.id]: {
                ...current,
                phase: 'resolved',
                turn,
                visitedSceneIds: definition.investigation.scenes.map((scene) => scene.id),
                discoveredEvidenceIds: definition.investigation.evidence.map(
                  (item) => item.id,
                ),
                solvedDeductionIds: [...definition.canonicalTruth.requiredDeductionIds],
                resolution: {
                  correct: true,
                  score: definition.scoring.maximumScore,
                  resolvedOnTurn: turn,
                },
              },
            },
            progress: touchProgress(state.progress, definition.id, {
              completed: true,
              completedAtEpochMs: Date.now(),
              score: definition.scoring.maximumScore,
            }),
          };
        }),

      devResetBoard: (caseId) =>
        set((state) => {
          const current = state.sessions[caseId];
          if (!current) return state;
          return {
            sessions: {
              ...state.sessions,
              [caseId]: {
                ...current,
                evidenceBoard: createEmptyEvidenceBoardState(),
              },
            },
          };
        }),
    }),
    {
      name: CASE_SESSION_STORAGE_KEY,
      version: CASE_SESSION_STORE_VERSION,
      storage: createJSONStorage(() => autosaveStorage),
      migrate: (persisted, version) => migrateCaseSessions(persisted, version),
      merge: (persisted, current) => {
        const { value, droppedCaseIds } = sanitizeCaseSessions(persisted);
        return {
          ...current,
          ...value,
          recoveredCaseIds: droppedCaseIds,
        };
      },
      partialize: ({ activeCaseId, sessions, progress }) => ({
        activeCaseId,
        sessions,
        progress,
      }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
