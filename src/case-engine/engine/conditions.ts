import type {
  CaseCondition,
  CaseDefinition,
  DeductionDefinition,
  SceneDefinition,
} from '../domain/case-definition';
import type { CasePlayerState } from '../domain/player-state';

export function isConditionMet(
  condition: CaseCondition | undefined,
  state: CasePlayerState,
): boolean {
  if (!condition) return true;

  switch (condition.kind) {
    case 'all':
      return condition.conditions.every((item) => isConditionMet(item, state));
    case 'any':
      return condition.conditions.some((item) => isConditionMet(item, state));
    case 'not':
      return !isConditionMet(condition.condition, state);
    case 'sceneVisited':
      return state.visitedSceneIds.includes(condition.sceneId);
    case 'evidenceDiscovered':
      return state.discoveredEvidenceIds.includes(condition.evidenceId);
    case 'evidenceViewed':
      return state.viewedEvidenceIds.includes(condition.evidenceId);
    case 'evidenceReferenced':
      return state.referencedEvidenceIds.includes(condition.evidenceId);
    case 'deductionSolved':
      return state.solvedDeductionIds.includes(condition.deductionId);
  }
}

export function getAvailableScenes(
  definition: CaseDefinition,
  state: CasePlayerState,
): readonly SceneDefinition[] {
  return definition.investigation.scenes.filter((scene) =>
    isConditionMet(scene.openWhen, state),
  );
}

export function getAvailableDeductions(
  definition: CaseDefinition,
  state: CasePlayerState,
): readonly DeductionDefinition[] {
  return definition.investigation.deductions.filter((deduction) =>
    isConditionMet(deduction.openWhen, state),
  );
}

export function isAccusationAvailable(
  definition: CaseDefinition,
  state: CasePlayerState,
) {
  return isConditionMet(definition.investigation.accusation.openWhen, state);
}
