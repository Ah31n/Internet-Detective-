import type {
  CaseId,
  DeductionId,
  OptionId,
  QuestionId,
  SceneId,
  TimelineEventId,
} from './case-definition';
import type { EvidenceBoardPlayerState } from './evidence-board';
import type {
  EvidenceConnection,
  EvidenceId,
} from './evidence';
import type { FictionalInternetPlayerState } from './fictional-internet';

export type CasePhase = 'briefing' | 'investigating' | 'resolved';

export interface DeductionAttempt {
  turn: number;
  selectedEvidenceIds: readonly EvidenceId[];
  correct: boolean;
}

export interface AccusationAttempt {
  turn: number;
  answers: Readonly<Record<QuestionId, OptionId>>;
  correct: boolean;
}

export interface EvidenceNote {
  evidenceId: EvidenceId;
  text: string;
  updatedOnTurn: number;
}

export interface HintUsage {
  deductionId: DeductionId;
  turn: number;
}

export interface CaseResolutionState {
  correct: true;
  score: number;
  resolvedOnTurn: number;
}

/** Serializable player progress. It never contains authored canonical truth. */
export interface CasePlayerState {
  caseId: CaseId;
  contentVersion: number;
  phase: CasePhase;
  turn: number;
  currentSceneId: SceneId | null;
  visitedSceneIds: readonly SceneId[];
  discoveredEvidenceIds: readonly EvidenceId[];
  viewedEvidenceIds: readonly EvidenceId[];
  referencedEvidenceIds: readonly EvidenceId[];
  evidenceConnections: readonly EvidenceConnection[];
  evidenceNotes: Readonly<Record<EvidenceId, EvidenceNote>>;
  theoryEvidenceIds: readonly EvidenceId[];
  pinnedTimelineEventIds: readonly TimelineEventId[];
  hintsUsed: readonly HintUsage[];
  evidenceBoard: EvidenceBoardPlayerState;
  fictionalInternet: FictionalInternetPlayerState;
  solvedDeductionIds: readonly DeductionId[];
  deductionAttempts: Readonly<Record<DeductionId, readonly DeductionAttempt[]>>;
  accusationAttempts: readonly AccusationAttempt[];
  resolution: CaseResolutionState | null;
}
