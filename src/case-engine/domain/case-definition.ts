import type { EvidenceDefinition, EvidenceId } from './evidence';
import type { FictionalInternetDefinition } from './fictional-internet';

export type CaseId = string;
export type SceneId = string;
export type DeductionId = string;
export type QuestionId = string;
export type OptionId = string;
export type SuspectId = string;
export type LocationId = string;
export type RelationshipId = string;
export type TimelineEventId = string;

export type CaseCondition =
  | { kind: 'all'; conditions: readonly CaseCondition[] }
  | { kind: 'any'; conditions: readonly CaseCondition[] }
  | { kind: 'not'; condition: CaseCondition }
  | { kind: 'sceneVisited'; sceneId: SceneId }
  | { kind: 'evidenceDiscovered'; evidenceId: EvidenceId }
  | { kind: 'evidenceViewed'; evidenceId: EvidenceId }
  | { kind: 'evidenceReferenced'; evidenceId: EvidenceId }
  | { kind: 'deductionSolved'; deductionId: DeductionId };

export interface CaseObjectiveDefinition {
  id: string;
  text: string;
}

export interface CaseBriefDefinition {
  classification: string;
  summary: string;
  objectives: readonly CaseObjectiveDefinition[];
}

export interface SuspectDefinition {
  id: SuspectId;
  name: string;
  role: string;
  summary: string;
  statedAlibi: string;
  tags: readonly string[];
}

export interface LocationDefinition {
  id: LocationId;
  name: string;
  kind:
    | 'gallery'
    | 'security'
    | 'service'
    | 'workspace'
    | 'hospitality'
    | 'exterior'
    | 'storage'
    | 'media';
  summary: string;
}

export interface RelationshipDefinition {
  id: RelationshipId;
  fromSuspectId: SuspectId;
  toSuspectId: SuspectId;
  label: string;
  summary: string;
  openWhen?: CaseCondition;
}

export interface TimelineEventDefinition {
  id: TimelineEventId;
  timeLabel: string;
  sortOrder: number;
  title: string;
  summary: string;
  locationId?: LocationId;
  suspectIds: readonly SuspectId[];
  sourceEvidenceIds: readonly EvidenceId[];
  openWhen?: CaseCondition;
}

export interface SceneDefinition {
  id: SceneId;
  kind: 'location' | 'profile' | 'inbox' | 'browser' | 'interview' | 'system';
  title: string;
  summary: string;
  suspectId?: SuspectId;
  locationId?: LocationId;
  openWhen?: CaseCondition;
  revealsEvidenceIds: readonly EvidenceId[];
}

export interface DeductionDefinition {
  id: DeductionId;
  prompt: string;
  openWhen?: CaseCondition;
  minimumEvidence: number;
  maximumEvidence: number;
  /**
   * Optional spoiler-safe nudge. It narrows where to look and never names the
   * canonical evidence set, the culprit, or any accusation answer.
   */
  hint?: string;
}

export interface AccusationOptionDefinition {
  id: OptionId;
  label: string;
}

export interface AccusationQuestionDefinition {
  id: QuestionId;
  prompt: string;
  options: readonly AccusationOptionDefinition[];
}

export interface AccusationDefinition {
  title: string;
  prompt: string;
  openWhen?: CaseCondition;
  questions: readonly AccusationQuestionDefinition[];
}

export interface DeductionTruthDefinition {
  requiredEvidenceIds: readonly EvidenceId[];
}

/**
 * Immutable authored truth. It is read only by deterministic engine evaluation
 * and is never exposed by the public investigation view model before resolution.
 */
export interface CanonicalTruthDefinition {
  deductionSolutions: Readonly<Record<DeductionId, DeductionTruthDefinition>>;
  accusationAnswers: Readonly<Record<QuestionId, OptionId>>;
  requiredDeductionIds: readonly DeductionId[];
  resolution: {
    headline: string;
    summary: string;
  };
}

export interface CaseScoringDefinition {
  maximumScore: number;
  incorrectDeductionPenalty: number;
  incorrectAccusationPenalty: number;
  /** Deducted once per revealed hint. Defaults to zero when omitted. */
  hintPenalty?: number;
}

export interface CaseDefinition {
  schemaVersion: 1;
  id: CaseId;
  contentVersion: number;
  metadata: {
    title: string;
    subtitle: string;
    classification: string;
    estimatedMinutes: number;
    difficulty: 'rookie' | 'field' | 'expert';
    tags: readonly string[];
  };
  brief: CaseBriefDefinition;
  investigation: {
    startingSceneId: SceneId;
    startingEvidenceIds: readonly EvidenceId[];
    suspects: readonly SuspectDefinition[];
    locations: readonly LocationDefinition[];
    relationships: readonly RelationshipDefinition[];
    timeline: readonly TimelineEventDefinition[];
    scenes: readonly SceneDefinition[];
    evidence: readonly EvidenceDefinition[];
    internet: FictionalInternetDefinition;
    deductions: readonly DeductionDefinition[];
    accusation: AccusationDefinition;
  };
  canonicalTruth: CanonicalTruthDefinition;
  scoring: CaseScoringDefinition;
}
