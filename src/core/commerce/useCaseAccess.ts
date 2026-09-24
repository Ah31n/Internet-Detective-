import { useMemo } from 'react';

import { CASE_DEFINITIONS } from '@/case-content/caseRegistry';
import { useEntitlementStore } from '@/state/entitlement.store';

import {
  canAccessCase,
  resolveCaseAvailability,
  resolveLibrary,
  type AccessContext,
  type CaseAvailability,
} from './caseAccess';

/**
 * The React face of `canAccessCase`.
 *
 * Screens use these hooks and nothing else. They never read the entitlement
 * store directly, never inspect a product, and never compare a case id to a
 * purchase — so no screen is hardcoded to a purchase state, and the day a case
 * becomes free or lands in a bundle, not one screen changes.
 */

function useAccessContext(): AccessContext {
  const grants = useEntitlementStore((state) => state.grants);

  return useMemo(
    () => ({
      grants,
      installedDefinitionIds: CASE_DEFINITIONS.map((definition) => definition.id),
    }),
    [grants],
  );
}

export function useCanAccessCase(caseId: string): boolean {
  const context = useAccessContext();
  return useMemo(() => canAccessCase(caseId, context), [caseId, context]);
}

export function useCaseAvailability(caseId: string): CaseAvailability | null {
  const context = useAccessContext();
  return useMemo(() => resolveCaseAvailability(caseId, context), [caseId, context]);
}

/** Every published case, in printed order, with its status resolved. */
export function useCaseLibrary(): readonly CaseAvailability[] {
  const context = useAccessContext();
  return useMemo(() => resolveLibrary(context), [context]);
}
