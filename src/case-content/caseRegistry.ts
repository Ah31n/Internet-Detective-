import type { CaseDefinition } from '@/case-engine';
import { assertValidCaseDefinition } from '@/case-engine';

import { CASE_001 } from './cases/case001/case001.definition';

/** Validated production cases available to the local mobile archive. */
export const CASE_DEFINITIONS: readonly CaseDefinition[] = [CASE_001];

for (const definition of CASE_DEFINITIONS) {
  assertValidCaseDefinition(definition);
}

export function getCaseDefinition(caseId: string) {
  return CASE_DEFINITIONS.find((definition) => definition.id === caseId);
}
