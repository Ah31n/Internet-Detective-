import type { CaseDefinition } from '../domain/case-definition';
import type { CasePlayerState } from '../domain/player-state';
import type { InvestigationViewModel } from '../domain/view-model';
import {
  getAvailableDeductions,
  getAvailableScenes,
  isAccusationAvailable,
  isConditionMet,
} from './conditions';

export function createInvestigationViewModel(
  definition: CaseDefinition,
  state: CasePlayerState,
): InvestigationViewModel {
  const availableScenes = getAvailableScenes(definition, state).map((scene) => ({
    ...scene,
    visited: state.visitedSceneIds.includes(scene.id),
    current: state.currentSceneId === scene.id,
  }));

  const currentScene = state.currentSceneId
    ? (availableScenes.find((scene) => scene.id === state.currentSceneId) ?? null)
    : null;

  const discoveredEvidence = definition.investigation.evidence
    .filter((item) => state.discoveredEvidenceIds.includes(item.id))
    .map((item) => ({
      ...item,
      viewed: state.viewedEvidenceIds.includes(item.id),
      referenced: state.referencedEvidenceIds.includes(item.id),
      connected: state.evidenceConnections.some(
        (connection) =>
          connection.fromEvidenceId === item.id ||
          connection.toEvidenceId === item.id,
      ),
      usedInTheory: state.theoryEvidenceIds.includes(item.id),
      note: state.evidenceNotes[item.id]?.text ?? null,
    }));

  const availableDeductions = getAvailableDeductions(definition, state).map(
    (deduction) => {
      const hintUsed = state.hintsUsed.some(
        (usage) => usage.deductionId === deduction.id,
      );
      const { hint, ...visible } = deduction;
      return {
        ...visible,
        solved: state.solvedDeductionIds.includes(deduction.id),
        attempts: state.deductionAttempts[deduction.id]?.length ?? 0,
        hintAvailable: Boolean(hint),
        hintUsed,
        // The authored nudge is withheld until the player spends a hint.
        hint: hintUsed ? (hint ?? null) : null,
      };
    },
  );
  const knownRelationships = definition.investigation.relationships.filter(
    (relationship) => isConditionMet(relationship.openWhen, state),
  );
  const knownTimeline = definition.investigation.timeline
    .filter(
      (event) =>
        isConditionMet(event.openWhen, state) &&
        event.sourceEvidenceIds.every((evidenceId) =>
          state.discoveredEvidenceIds.includes(evidenceId),
        ),
    )
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((event) => ({
      ...event,
      pinned: state.pinnedTimelineEventIds.includes(event.id),
    }));

  return {
    caseId: definition.id,
    title: definition.metadata.title,
    subtitle: definition.metadata.subtitle,
    classification: definition.metadata.classification,
    brief: definition.brief,
    phase: state.phase,
    turn: state.turn,
    currentScene,
    availableScenes,
    suspects: definition.investigation.suspects,
    locations: definition.investigation.locations,
    knownRelationships,
    knownTimeline,
    discoveredEvidence,
    evidenceConnections: state.evidenceConnections,
    availableDeductions,
    accusation:
      state.phase === 'investigating' && isAccusationAvailable(definition, state)
        ? definition.investigation.accusation
        : null,
    progress: {
      visitedScenes: state.visitedSceneIds.length,
      totalScenes: definition.investigation.scenes.length,
      discoveredEvidence: state.discoveredEvidenceIds.length,
      totalEvidence: definition.investigation.evidence.length,
      viewedEvidence: state.viewedEvidenceIds.length,
      referencedEvidence: state.referencedEvidenceIds.length,
      evidenceConnections: state.evidenceConnections.length,
      theoryEvidence: state.theoryEvidenceIds.length,
      solvedDeductions: state.solvedDeductionIds.length,
      totalDeductions: definition.investigation.deductions.length,
      evidenceNotes: Object.keys(state.evidenceNotes).length,
      pinnedTimelineEvents: state.pinnedTimelineEventIds.length,
      hintsUsed: state.hintsUsed.length,
    },
    resolution:
      state.phase === 'resolved' && state.resolution
        ? {
            score: state.resolution.score,
            maximumScore: definition.scoring.maximumScore,
            headline: definition.canonicalTruth.resolution.headline,
            summary: definition.canonicalTruth.resolution.summary,
          }
        : null,
  };
}
