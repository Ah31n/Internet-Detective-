import type { CasePlayerState } from '@/case-engine';

/**
 * Deterministic, offline progression rules.
 *
 * Achievements and detective level are derived from persisted player progress.
 * Nothing here consults a server, an API, or an AI, and nothing here can change
 * canonical case truth.
 */

export interface CaseProgressSnapshot {
  caseId: string;
  discoveredEvidence: number;
  viewedEvidence: number;
  evidenceNotes: number;
  evidenceConnections: number;
  boardPlacements: number;
  evidenceGroups: number;
  theories: number;
  pinnedTimelineEvents: number;
  hintsUsed: number;
  solvedDeductions: number;
  completed: boolean;
  score: number | null;
  investigationDurationMs: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  /** Evaluated against every case snapshot the player owns. */
  isUnlocked: (snapshots: readonly CaseProgressSnapshot[]) => boolean;
}

export interface AchievementRecord {
  id: string;
  unlockedAtEpochMs: number;
}

export interface DetectiveLevel {
  level: number;
  title: string;
  experience: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number | null;
}

export function createCaseProgressSnapshot(
  state: CasePlayerState,
  meta: { investigationDurationMs: number } | undefined,
): CaseProgressSnapshot {
  return {
    caseId: state.caseId,
    discoveredEvidence: state.discoveredEvidenceIds.length,
    viewedEvidence: state.viewedEvidenceIds.length,
    evidenceNotes: Object.keys(state.evidenceNotes).length,
    evidenceConnections: state.evidenceConnections.length,
    boardPlacements: Object.keys(state.evidenceBoard.placements).length,
    evidenceGroups: state.evidenceBoard.groups.length,
    theories: state.evidenceBoard.theoryClusters.length,
    pinnedTimelineEvents: state.pinnedTimelineEventIds.length,
    hintsUsed: state.hintsUsed.length,
    solvedDeductions: state.solvedDeductionIds.length,
    completed: state.phase === 'resolved' && state.resolution !== null,
    score: state.resolution?.score ?? null,
    investigationDurationMs: meta?.investigationDurationMs ?? 0,
  };
}

const total = (
  snapshots: readonly CaseProgressSnapshot[],
  pick: (snapshot: CaseProgressSnapshot) => number,
) => snapshots.reduce((sum, snapshot) => sum + pick(snapshot), 0);

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'achievement-first-artifact',
    title: 'First Artifact',
    description: 'Collect your first piece of evidence.',
    isUnlocked: (snapshots) => total(snapshots, (item) => item.discoveredEvidence) >= 1,
  },
  {
    id: 'achievement-collector',
    title: 'Collector',
    description: 'Collect twenty-five pieces of evidence in a single case.',
    isUnlocked: (snapshots) =>
      snapshots.some((snapshot) => snapshot.discoveredEvidence >= 25),
  },
  {
    id: 'achievement-annotator',
    title: 'Margin Notes',
    description: 'Write five evidence notes.',
    isUnlocked: (snapshots) => total(snapshots, (item) => item.evidenceNotes) >= 5,
  },
  {
    id: 'achievement-string-theory',
    title: 'String Theory',
    description: 'Create ten evidence connections on the board.',
    isUnlocked: (snapshots) =>
      total(snapshots, (item) => item.evidenceConnections) >= 10,
  },
  {
    id: 'achievement-theorist',
    title: 'Working Theory',
    description: 'Build a theory cluster on the evidence board.',
    isUnlocked: (snapshots) => total(snapshots, (item) => item.theories) >= 1,
  },
  {
    id: 'achievement-chronologist',
    title: 'Chronologist',
    description: 'Pin five verified events to your timeline.',
    isUnlocked: (snapshots) =>
      total(snapshots, (item) => item.pinnedTimelineEvents) >= 5,
  },
  {
    id: 'achievement-first-deduction',
    title: 'Reasoned Conclusion',
    description: 'Prove your first deduction.',
    isUnlocked: (snapshots) => total(snapshots, (item) => item.solvedDeductions) >= 1,
  },
  {
    id: 'achievement-case-closed',
    title: 'Case Closed',
    description: 'Resolve a case correctly.',
    isUnlocked: (snapshots) => snapshots.some((snapshot) => snapshot.completed),
  },
  {
    id: 'achievement-unaided',
    title: 'Unaided',
    description: 'Resolve a case without spending a single hint.',
    isUnlocked: (snapshots) =>
      snapshots.some((snapshot) => snapshot.completed && snapshot.hintsUsed === 0),
  },
  {
    id: 'achievement-flawless',
    title: 'Flawless Record',
    description: 'Resolve a case with a perfect score.',
    isUnlocked: (snapshots) =>
      snapshots.some((snapshot) => snapshot.completed && snapshot.score === 100),
  },
];

export function evaluateAchievements(
  snapshots: readonly CaseProgressSnapshot[],
  existing: readonly AchievementRecord[],
  nowEpochMs: number,
): readonly AchievementRecord[] {
  const unlocked = new Map(existing.map((record) => [record.id, record]));
  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue;
    if (achievement.isUnlocked(snapshots)) {
      unlocked.set(achievement.id, {
        id: achievement.id,
        unlockedAtEpochMs: nowEpochMs,
      });
    }
  }
  return ACHIEVEMENTS.filter((achievement) => unlocked.has(achievement.id)).map(
    (achievement) => unlocked.get(achievement.id)!,
  );
}

export function calculateExperience(
  snapshots: readonly CaseProgressSnapshot[],
): number {
  return snapshots.reduce((sum, snapshot) => {
    const caseExperience =
      snapshot.discoveredEvidence * 2 +
      snapshot.viewedEvidence * 1 +
      snapshot.evidenceNotes * 3 +
      snapshot.evidenceConnections * 2 +
      snapshot.theories * 5 +
      snapshot.pinnedTimelineEvents * 2 +
      snapshot.solvedDeductions * 15 +
      (snapshot.completed ? 100 + (snapshot.score ?? 0) : 0);
    return sum + caseExperience;
  }, 0);
}

const LEVEL_THRESHOLDS: readonly { level: number; title: string; experience: number }[] =
  [
    { level: 1, title: 'Case Reader', experience: 0 },
    { level: 2, title: 'Field Assistant', experience: 60 },
    { level: 3, title: 'Junior Detective', experience: 160 },
    { level: 4, title: 'Detective', experience: 320 },
    { level: 5, title: 'Senior Detective', experience: 520 },
    { level: 6, title: 'Lead Investigator', experience: 780 },
    { level: 7, title: 'Chief Investigator', experience: 1100 },
  ];

export function calculateDetectiveLevel(experience: number): DetectiveLevel {
  const safeExperience = Number.isFinite(experience) ? Math.max(0, experience) : 0;
  let current = LEVEL_THRESHOLDS[0]!;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (safeExperience >= threshold.experience) current = threshold;
  }
  const next = LEVEL_THRESHOLDS.find(
    (threshold) => threshold.experience > safeExperience,
  );

  return {
    level: current.level,
    title: current.title,
    experience: safeExperience,
    experienceIntoLevel: safeExperience - current.experience,
    experienceForNextLevel: next ? next.experience - current.experience : null,
  };
}
