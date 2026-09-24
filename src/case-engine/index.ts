export type {
  CaseAction,
  CaseEngineError,
  CaseEngineErrorCode,
  CaseEngineEvent,
} from './domain/case-action';
export type {
  AccusationDefinition,
  AccusationQuestionDefinition,
  CanonicalTruthDefinition,
  CaseCondition,
  CaseDefinition,
  CaseId,
  DeductionDefinition,
  DeductionId,
  LocationDefinition,
  LocationId,
  OptionId,
  QuestionId,
  RelationshipDefinition,
  RelationshipId,
  SceneDefinition,
  SceneId,
  SuspectDefinition,
  SuspectId,
  TimelineEventDefinition,
  TimelineEventId,
} from './domain/case-definition';
export type {
  EvidenceBoardGroup,
  EvidenceBoardGroupId,
  EvidenceBoardPlacement,
  EvidenceBoardPlayerState,
  EvidenceBoardViewport,
  TheoryCluster,
  TheoryClusterId,
} from './domain/evidence-board';
export type {
  CCTVEvidenceDefinition,
  DocumentEvidenceDefinition,
  EmailEvidenceDefinition,
  EvidenceConnection,
  EvidenceConnectionKind,
  EvidenceDefinition,
  EvidenceId,
  EvidenceMediaReference,
  EvidenceTextBlock,
  EvidenceType,
  MessageEvidenceDefinition,
  PhotoEvidenceDefinition,
  ReceiptEvidenceDefinition,
  StatementEvidenceDefinition,
  WebpageEvidenceDefinition,
} from './domain/evidence';
export type {
  FictionalInternetDefinition,
  FictionalInternetLocation,
  FictionalInternetPlayerState,
  FictionalInternetSearchResult,
  FictionalPageBlock,
  FictionalPageDefinition,
  FictionalPageId,
  FictionalPageLink,
  FictionalSiteDefinition,
  FictionalSiteId,
  FictionalSiteIdentity,
  FictionalSiteLayout,
  LocalInternetImageReference,
} from './domain/fictional-internet';
export type {
  AccusationAttempt,
  CasePhase,
  CasePlayerState,
  CaseResolutionState,
  DeductionAttempt,
  EvidenceNote,
  HintUsage,
} from './domain/player-state';
export type {
  DeductionViewModel,
  EvidenceViewModel,
  InvestigationViewModel,
  TimelineEventViewModel,
} from './domain/view-model';
export {
  getAvailableDeductions,
  getAvailableScenes,
  isAccusationAvailable,
  isConditionMet,
} from './engine/conditions';
export {
  createDefaultEvidenceBoardPlacement,
  createEmptyEvidenceBoardState,
  EVIDENCE_BOARD_HEIGHT,
  EVIDENCE_BOARD_ITEM_HEIGHT,
  EVIDENCE_BOARD_ITEM_WIDTH,
  EVIDENCE_BOARD_MAX_SCALE,
  EVIDENCE_BOARD_MIN_SCALE,
  EVIDENCE_BOARD_WIDTH,
  normalizeEvidenceBoardPlacement,
  normalizeEvidenceBoardViewport,
} from './engine/evidence-board';
export {
  createFictionalPageKey,
  getAvailableFictionalSites,
  getFictionalPage,
  getFictionalSite,
  searchFictionalInternet,
} from './engine/fictional-internet';
export { createInvestigationViewModel } from './engine/selectors';
export {
  createEvidenceConnectionId,
  createInitialCasePlayerState,
  EVIDENCE_NOTE_MAX_LENGTH,
  transitionCase,
  type CaseTransitionResult,
} from './engine/transition';
export {
  assertValidCaseDefinition,
  InvalidCaseDefinitionError,
  validateCaseDefinition,
  type CaseDefinitionIssue,
} from './engine/validation';
