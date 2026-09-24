import type {
  AccusationDefinition,
  CaseBriefDefinition,
  CaseDefinition,
  DeductionDefinition,
  LocationDefinition,
  RelationshipDefinition,
  SceneDefinition,
  SuspectDefinition,
  TimelineEventDefinition,
} from './case-definition';
import type {
  EvidenceConnection,
  EvidenceDefinition,
} from './evidence';
import type { CasePhase } from './player-state';

export interface SceneViewModel extends SceneDefinition {
  visited: boolean;
  current: boolean;
}

export type EvidenceViewModel = EvidenceDefinition & {
  viewed: boolean;
  referenced: boolean;
  connected: boolean;
  usedInTheory: boolean;
  /** Player-authored annotation, persisted with the session. */
  note: string | null;
};

export interface DeductionViewModel extends Omit<DeductionDefinition, 'hint'> {
  solved: boolean;
  attempts: number;
  hintAvailable: boolean;
  hintUsed: boolean;
  /** Authored nudge text, revealed only after the player spends a hint. */
  hint: string | null;
}

export interface TimelineEventViewModel extends TimelineEventDefinition {
  pinned: boolean;
}

/** Truth-redacted data contract consumed by React Native investigation screens. */
export interface InvestigationViewModel {
  caseId: string;
  title: string;
  subtitle: string;
  classification: string;
  brief: CaseBriefDefinition;
  phase: CasePhase;
  turn: number;
  currentScene: SceneViewModel | null;
  availableScenes: readonly SceneViewModel[];
  suspects: readonly SuspectDefinition[];
  locations: readonly LocationDefinition[];
  knownRelationships: readonly RelationshipDefinition[];
  knownTimeline: readonly TimelineEventViewModel[];
  discoveredEvidence: readonly EvidenceViewModel[];
  evidenceConnections: readonly EvidenceConnection[];
  availableDeductions: readonly DeductionViewModel[];
  accusation: AccusationDefinition | null;
  progress: {
    visitedScenes: number;
    totalScenes: number;
    discoveredEvidence: number;
    totalEvidence: number;
    viewedEvidence: number;
    referencedEvidence: number;
    evidenceConnections: number;
    theoryEvidence: number;
    solvedDeductions: number;
    totalDeductions: number;
    evidenceNotes: number;
    pinnedTimelineEvents: number;
    hintsUsed: number;
  };
  resolution: null | {
    score: number;
    maximumScore: number;
    headline: string;
    summary: string;
  };
}

/** Compile-time guard: renderers receive this view model, not CaseDefinition truth. */
export type RenderableCaseMetadata = Pick<
  CaseDefinition,
  'id' | 'metadata' | 'brief'
>;
