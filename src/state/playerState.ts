import { useEffect, useState } from 'react';

import {
  calculateDetectiveLevel,
  createCaseProgressSnapshot,
  type AchievementRecord,
  type CaseProgressSnapshot,
  type DetectiveLevel,
} from '@/core/progression/progression';

import { useAppStore, type AppSettings } from './app.store';
import {
  useCaseSessionStore,
  type CaseProgressMeta,
  type CaseSessionStore,
} from './case-session.store';
import {
  getSaveHealth,
  subscribeToSaveHealth,
  type SaveHealthRecord,
} from './persistence/autosaveStorage';
import {
  usePlayerProfileStore,
  type PlayerProfileStore,
} from './player-profile.store';

/**
 * Single read model for persisted player state. The underlying stores stay
 * separated by concern (shell settings, case sessions, profile), but gameplay
 * code can read one coherent snapshot.
 */
export interface PlayerState {
  currentCaseId: string | null;
  completedCaseIds: readonly string[];
  caseProgress: Readonly<Record<string, CaseProgressMeta>>;
  settings: AppSettings;
  achievements: readonly AchievementRecord[];
  detectiveLevel: DetectiveLevel;
  hasHydrated: boolean;
}

export function selectCaseProgressSnapshots(
  state: Pick<CaseSessionStore, 'sessions' | 'progress'>,
): readonly CaseProgressSnapshot[] {
  return Object.values(state.sessions).map((session) =>
    createCaseProgressSnapshot(session, state.progress[session.caseId]),
  );
}

export function usePlayerState(): PlayerState {
  const settings = useAppStore((state) => state.settings);
  const appHydrated = useAppStore((state) => state.hasHydrated);
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const caseProgress = useCaseSessionStore((state) => state.progress);
  const sessionsHydrated = useCaseSessionStore((state) => state.hasHydrated);
  const completedCaseIds = usePlayerProfileStore((state) => state.completedCaseIds);
  const achievements = usePlayerProfileStore((state) => state.achievements);
  const experience = usePlayerProfileStore((state) => state.experience);
  const profileHydrated = usePlayerProfileStore((state) => state.hasHydrated);

  return {
    currentCaseId: activeCaseId,
    completedCaseIds,
    caseProgress,
    settings,
    achievements,
    detectiveLevel: calculateDetectiveLevel(experience),
    hasHydrated: appHydrated && sessionsHydrated && profileHydrated,
  };
}

export function useSaveHealth(): readonly SaveHealthRecord[] {
  const [records, setRecords] = useState<readonly SaveHealthRecord[]>(getSaveHealth);

  useEffect(() => subscribeToSaveHealth(setRecords), []);

  return records;
}

/**
 * Keeps the persisted profile (completed cases, achievements, detective level)
 * derived from persisted case progress. Runs locally, with no network access.
 */
export function startProgressionBridge(): () => void {
  const sync = (state: Pick<CaseSessionStore, 'sessions' | 'progress' | 'activeCaseId'>) => {
    const profile: PlayerProfileStore = usePlayerProfileStore.getState();
    profile.setCurrentCase(state.activeCaseId);
    profile.syncProgress(selectCaseProgressSnapshots(state));
  };

  sync(useCaseSessionStore.getState());

  return useCaseSessionStore.subscribe((state, previous) => {
    if (
      state.sessions === previous.sessions &&
      state.progress === previous.progress &&
      state.activeCaseId === previous.activeCaseId
    ) {
      return;
    }
    sync(state);
  });
}
