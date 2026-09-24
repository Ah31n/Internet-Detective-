import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  calculateDetectiveLevel,
  calculateExperience,
  evaluateAchievements,
  type AchievementRecord,
  type CaseProgressSnapshot,
  type DetectiveLevel,
} from '@/core/progression/progression';

import { autosaveStorage } from './persistence/autosaveStorage';

interface PlayerProfileState {
  currentCaseId: string | null;
  completedCaseIds: readonly string[];
  achievements: readonly AchievementRecord[];
  experience: number;
  hasHydrated: boolean;
}

interface PlayerProfileActions {
  markHydrated: () => void;
  setCurrentCase: (caseId: string | null) => void;
  /** Recomputes progression from persisted case snapshots. Deterministic. */
  syncProgress: (snapshots: readonly CaseProgressSnapshot[]) => void;
  resetProfile: () => void;
}

export type PlayerProfileStore = PlayerProfileState & PlayerProfileActions;
type PersistedPlayerProfile = Omit<PlayerProfileState, 'hasHydrated'>;

export const PLAYER_PROFILE_STORAGE_KEY = 'internet-detective.player-profile';
export const PLAYER_PROFILE_STORE_VERSION = 1;

const initialPersistedState: PersistedPlayerProfile = {
  currentCaseId: null,
  completedCaseIds: [],
  achievements: [],
  experience: 0,
};

export const usePlayerProfileStore = create<PlayerProfileStore>()(
  persist<PlayerProfileStore, [], [], PersistedPlayerProfile>(
    (set) => ({
      ...initialPersistedState,
      hasHydrated: false,

      markHydrated: () => set({ hasHydrated: true }),

      setCurrentCase: (caseId) =>
        set((state) => (state.currentCaseId === caseId ? state : { currentCaseId: caseId })),

      syncProgress: (snapshots) =>
        set((state) => {
          const completedCaseIds = snapshots
            .filter((snapshot) => snapshot.completed)
            .map((snapshot) => snapshot.caseId);
          const achievements = evaluateAchievements(
            snapshots,
            state.achievements,
            Date.now(),
          );
          const experience = calculateExperience(snapshots);

          const unchanged =
            experience === state.experience &&
            achievements.length === state.achievements.length &&
            completedCaseIds.length === state.completedCaseIds.length &&
            completedCaseIds.every((caseId) => state.completedCaseIds.includes(caseId));

          return unchanged ? state : { completedCaseIds, achievements, experience };
        }),

      resetProfile: () => set(initialPersistedState),
    }),
    {
      name: PLAYER_PROFILE_STORAGE_KEY,
      version: PLAYER_PROFILE_STORE_VERSION,
      storage: createJSONStorage(() => autosaveStorage),
      merge: (persisted, current) => {
        const source =
          typeof persisted === 'object' && persisted !== null
            ? (persisted as Partial<PersistedPlayerProfile>)
            : {};
        return {
          ...current,
          currentCaseId:
            typeof source.currentCaseId === 'string' ? source.currentCaseId : null,
          completedCaseIds: Array.isArray(source.completedCaseIds)
            ? source.completedCaseIds.filter(
                (caseId): caseId is string => typeof caseId === 'string',
              )
            : [],
          achievements: Array.isArray(source.achievements)
            ? source.achievements.filter(
                (record): record is AchievementRecord =>
                  typeof record === 'object' &&
                  record !== null &&
                  typeof (record as AchievementRecord).id === 'string',
              )
            : [],
          experience:
            typeof source.experience === 'number' && Number.isFinite(source.experience)
              ? Math.max(0, source.experience)
              : 0,
        };
      },
      partialize: ({ currentCaseId, completedCaseIds, achievements, experience }) => ({
        currentCaseId,
        completedCaseIds,
        achievements,
        experience,
      }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

export function selectDetectiveLevel(state: PlayerProfileStore): DetectiveLevel {
  return calculateDetectiveLevel(state.experience);
}
