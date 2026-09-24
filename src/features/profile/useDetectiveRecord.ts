import { useMemo } from 'react';

import { getCaseCatalogEntry } from '@/core/commerce';
import {
  buildActiveInvestigations,
  buildInvestigationRecord,
  type ActiveInvestigation,
  type RecordFigure,
} from '@/core/progression/profileStatistics';
import {
  ACHIEVEMENTS,
  calculateDetectiveLevel,
  type AchievementDefinition,
  type DetectiveLevel,
} from '@/core/progression/progression';
import { useCaseSessionStore } from '@/state/case-session.store';
import { usePlayerProfileStore } from '@/state/player-profile.store';
import { selectCaseProgressSnapshots } from '@/state/playerState';

export interface ClosedCaseRecord {
  caseId: string;
  number: string;
  title: string;
  closedAtEpochMs: number | null;
  score: number | null;
}

export interface Commendation {
  definition: AchievementDefinition;
  awardedAtEpochMs: number | null;
}

export interface DetectiveRecord {
  level: DetectiveLevel;
  closedCases: readonly ClosedCaseRecord[];
  activeInvestigations: readonly (ActiveInvestigation & {
    number: string;
    title: string;
  })[];
  commendations: readonly Commendation[];
  awardedCount: number;
  figures: readonly RecordFigure[];
}

/**
 * Assembles everything the record page prints, from persisted progress only.
 * Nothing here is generated, estimated, or fetched — a figure appears because
 * the player did the work, or it does not appear at all.
 */
export function useDetectiveRecord(): DetectiveRecord {
  const sessions = useCaseSessionStore((state) => state.sessions);
  const progress = useCaseSessionStore((state) => state.progress);
  const experience = usePlayerProfileStore((state) => state.experience);
  const achievements = usePlayerProfileStore((state) => state.achievements);

  return useMemo(() => {
    const snapshots = selectCaseProgressSnapshots({ sessions, progress });

    const named = (caseId: string) => {
      const entry = getCaseCatalogEntry(caseId);
      return {
        number: entry?.number ?? '—',
        title: entry?.title ?? caseId.toUpperCase(),
      };
    };

    const closedCases = snapshots
      .filter((snapshot) => snapshot.completed)
      .map((snapshot): ClosedCaseRecord => {
        const meta = progress[snapshot.caseId];
        return {
          caseId: snapshot.caseId,
          ...named(snapshot.caseId),
          closedAtEpochMs: meta?.completedAtEpochMs ?? null,
          score: snapshot.score,
        };
      })
      .sort((left, right) => (right.closedAtEpochMs ?? 0) - (left.closedAtEpochMs ?? 0));

    const lastOpened = Object.fromEntries(
      Object.values(progress).map((meta) => [meta.caseId, meta.lastOpenedAtEpochMs]),
    );

    const activeInvestigations = buildActiveInvestigations(snapshots, lastOpened).map(
      (investigation) => ({ ...investigation, ...named(investigation.caseId) }),
    );

    const awarded = new Map(
      achievements.map((record) => [record.id, record.unlockedAtEpochMs]),
    );

    const commendations = ACHIEVEMENTS.map((definition): Commendation => ({
      definition,
      awardedAtEpochMs: awarded.get(definition.id) ?? null,
    }));

    return {
      level: calculateDetectiveLevel(experience),
      closedCases,
      activeInvestigations,
      commendations,
      awardedCount: achievements.length,
      figures: buildInvestigationRecord(snapshots),
    };
  }, [sessions, progress, experience, achievements]);
}
