import type {
  DeductionId,
  OptionId,
  QuestionId,
  SceneId,
  TimelineEventId,
} from './case-definition';
import type {
  EvidenceBoardGroupId,
  TheoryClusterId,
} from './evidence-board';
import type {
  EvidenceConnectionKind,
  EvidenceId,
} from './evidence';
import type {
  FictionalPageId,
  FictionalSiteId,
} from './fictional-internet';

export type CaseAction =
  | { type: 'BEGIN_INVESTIGATION' }
  | { type: 'VISIT_SCENE'; sceneId: SceneId }
  | { type: 'VIEW_EVIDENCE'; evidenceId: EvidenceId }
  | {
      type: 'SET_EVIDENCE_REFERENCED';
      evidenceId: EvidenceId;
      referenced: boolean;
    }
  | {
      type: 'CONNECT_EVIDENCE';
      fromEvidenceId: EvidenceId;
      toEvidenceId: EvidenceId;
      kind: EvidenceConnectionKind;
    }
  | { type: 'DISCONNECT_EVIDENCE'; connectionId: string }
  | { type: 'SET_EVIDENCE_NOTE'; evidenceId: EvidenceId; text: string }
  | {
      type: 'SET_TIMELINE_EVENT_PINNED';
      timelineEventId: TimelineEventId;
      pinned: boolean;
    }
  | { type: 'USE_HINT'; deductionId: DeductionId }
  | { type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' }
  | {
      type: 'MOVE_EVIDENCE_ON_BOARD';
      evidenceId: EvidenceId;
      x: number;
      y: number;
      rotation: number;
    }
  | {
      type: 'SET_EVIDENCE_BOARD_VIEWPORT';
      x: number;
      y: number;
      scale: number;
    }
  | {
      type: 'CREATE_EVIDENCE_BOARD_GROUP';
      label: string;
      evidenceIds: readonly EvidenceId[];
    }
  | { type: 'DELETE_EVIDENCE_BOARD_GROUP'; groupId: EvidenceBoardGroupId }
  | {
      type: 'CREATE_THEORY_CLUSTER';
      title: string;
      evidenceIds: readonly EvidenceId[];
    }
  | { type: 'DELETE_THEORY_CLUSTER'; clusterId: TheoryClusterId }
  | {
      type: 'OPEN_INTERNET_PAGE';
      siteId: FictionalSiteId;
      pageId: FictionalPageId;
    }
  | { type: 'INTERNET_BACK' }
  | { type: 'INTERNET_FORWARD' }
  | {
      type: 'SET_INTERNET_PAGE_BOOKMARKED';
      siteId: FictionalSiteId;
      pageId: FictionalPageId;
      bookmarked: boolean;
    }
  | {
      type: 'SUBMIT_DEDUCTION';
      deductionId: DeductionId;
      evidenceIds: readonly EvidenceId[];
    }
  | {
      type: 'SUBMIT_ACCUSATION';
      answers: Readonly<Record<QuestionId, OptionId>>;
    };

export type CaseEngineErrorCode =
  | 'CASE_MISMATCH'
  | 'CONTENT_VERSION_MISMATCH'
  | 'CASE_ALREADY_RESOLVED'
  | 'INVALID_PHASE'
  | 'UNKNOWN_SCENE'
  | 'SCENE_LOCKED'
  | 'UNKNOWN_EVIDENCE'
  | 'EVIDENCE_NOT_DISCOVERED'
  | 'INVALID_EVIDENCE_CONNECTION'
  | 'UNKNOWN_EVIDENCE_CONNECTION'
  | 'INVALID_EVIDENCE_BOARD_POSITION'
  | 'INVALID_EVIDENCE_BOARD_SELECTION'
  | 'UNKNOWN_EVIDENCE_BOARD_GROUP'
  | 'UNKNOWN_THEORY_CLUSTER'
  | 'UNKNOWN_FICTIONAL_SITE'
  | 'UNKNOWN_FICTIONAL_PAGE'
  | 'FICTIONAL_SITE_LOCKED'
  | 'INTERNET_HISTORY_UNAVAILABLE'
  | 'UNKNOWN_TIMELINE_EVENT'
  | 'TIMELINE_EVENT_LOCKED'
  | 'NOTE_TOO_LONG'
  | 'HINT_UNAVAILABLE'
  | 'UNKNOWN_DEDUCTION'
  | 'DEDUCTION_LOCKED'
  | 'INVALID_EVIDENCE_SELECTION'
  | 'ACCUSATION_LOCKED'
  | 'INVALID_ACCUSATION';

export interface CaseEngineError {
  code: CaseEngineErrorCode;
  message: string;
}

export type CaseEngineEvent =
  | { type: 'investigation_started'; turn: number }
  | { type: 'scene_entered'; turn: number; sceneId: SceneId }
  | { type: 'evidence_discovered'; turn: number; evidenceId: EvidenceId }
  | { type: 'evidence_viewed'; turn: number; evidenceId: EvidenceId }
  | {
      type: 'evidence_reference_changed';
      turn: number;
      evidenceId: EvidenceId;
      referenced: boolean;
    }
  | {
      type: 'evidence_connected';
      turn: number;
      connectionId: string;
      fromEvidenceId: EvidenceId;
      toEvidenceId: EvidenceId;
      kind: EvidenceConnectionKind;
    }
  | { type: 'evidence_disconnected'; turn: number; connectionId: string }
  | {
      type: 'evidence_note_saved';
      turn: number;
      evidenceId: EvidenceId;
      cleared: boolean;
    }
  | {
      type: 'timeline_event_pinned';
      turn: number;
      timelineEventId: TimelineEventId;
      pinned: boolean;
    }
  | { type: 'hint_used'; turn: number; deductionId: DeductionId }
  | {
      type: 'evidence_board_arranged';
      turn: number;
      evidenceIds: readonly EvidenceId[];
    }
  | {
      type: 'evidence_board_item_moved';
      turn: number;
      evidenceId: EvidenceId;
    }
  | { type: 'evidence_board_viewport_changed'; turn: number }
  | {
      type: 'evidence_board_group_created';
      turn: number;
      groupId: EvidenceBoardGroupId;
      evidenceIds: readonly EvidenceId[];
    }
  | {
      type: 'evidence_board_group_deleted';
      turn: number;
      groupId: EvidenceBoardGroupId;
    }
  | {
      type: 'theory_cluster_created';
      turn: number;
      clusterId: TheoryClusterId;
      evidenceIds: readonly EvidenceId[];
    }
  | {
      type: 'theory_cluster_deleted';
      turn: number;
      clusterId: TheoryClusterId;
    }
  | {
      type: 'internet_page_opened';
      turn: number;
      siteId: FictionalSiteId;
      pageId: FictionalPageId;
      direction: 'new' | 'back' | 'forward';
    }
  | {
      type: 'internet_bookmark_changed';
      turn: number;
      siteId: FictionalSiteId;
      pageId: FictionalPageId;
      bookmarked: boolean;
    }
  | {
      type: 'deduction_evaluated';
      turn: number;
      deductionId: DeductionId;
      correct: boolean;
    }
  | { type: 'accusation_evaluated'; turn: number; correct: boolean }
  | { type: 'case_resolved'; turn: number; score: number };
