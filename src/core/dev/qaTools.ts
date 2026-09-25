import { router } from 'expo-router';

import { getCaseDefinition } from '@/case-content/caseRegistry';
import type { CaseAction, CaseDefinition } from '@/case-engine';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';
import {
  applyDeveloperGrant,
  getDeveloperGrantPreset,
  revokeAllDeveloperGrants,
} from '@/core/commerce';
import { autosaveStorage } from '@/state/persistence/autosaveStorage';
import { usePlayerProfileStore } from '@/state/player-profile.store';

import { DEV_TOOLS_ENABLED } from './devMode';

/**
 * THE QA TOOL REGISTRY
 *
 * Every tool is a named, described, categorised action with an outcome string,
 * so the console is a list rendered from data rather than a wall of buttons,
 * and so the whole set can be exercised by a test without a device.
 *
 * Two rules hold throughout:
 *
 * 1. **Every tool runs through the real engine or the real store.** Nothing
 *    hand-writes a player state. A QA shortcut that fabricates a state the
 *    engine could never produce is worse than no shortcut — it sends testers
 *    hunting bugs that only the shortcut can cause.
 *
 * 2. **Every tool refuses to run when the gate is shut.** Not because a caller
 *    is expected in production — there is no caller in production, the code is
 *    eliminated — but because defence in depth costs one line.
 */

export type QAToolCategory = 'case' | 'evidence' | 'board' | 'account' | 'spoiler';

export interface QAToolResult {
  ok: boolean;
  /** One line for the console log. Present tense, factual. */
  message: string;
}

export interface QATool {
  id: string;
  label: string;
  description: string;
  category: QAToolCategory;
  /** Tools that throw progress away ask first. */
  destructive?: boolean;
  run: () => QAToolResult;
}

const CASE_ID = 'case-001-missing-diamond';

const blocked: QAToolResult = {
  ok: false,
  message: 'Developer tools are disabled in this build.',
};

function requireCase(): CaseDefinition | null {
  return getCaseDefinition(CASE_ID) ?? null;
}

function dispatch(definition: CaseDefinition, action: CaseAction) {
  return useCaseSessionStore.getState().dispatchCaseAction(definition, action);
}

/** Makes sure a session exists and the investigation has actually begun. */
function ensureStarted(definition: CaseDefinition) {
  const store = useCaseSessionStore.getState();
  if (!store.sessions[definition.id]) store.activateCase(definition);
  const session = useCaseSessionStore.getState().sessions[definition.id];
  if (session?.phase === 'briefing') {
    dispatch(definition, { type: 'BEGIN_INVESTIGATION' });
  }
}

function discoveredIds(): readonly string[] {
  return useCaseSessionStore.getState().sessions[CASE_ID]?.discoveredEvidenceIds ?? [];
}

// ---------------------------------------------------------------------------

export const QA_TOOLS: readonly QATool[] = [
  {
    id: 'reset-case',
    label: 'RESET CASE 001',
    description: 'Clears the session and returns the case to its briefing state.',
    category: 'case',
    destructive: true,
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      useCaseSessionStore.getState().clearCase(definition.id);
      return { ok: true, message: 'Case 001 reset to briefing.' };
    },
  },
  {
    id: 'complete-case',
    label: 'COMPLETE CASE 001',
    description:
      'Marks the case resolved at full score with every canonical deduction solved.',
    category: 'case',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      useCaseSessionStore.getState().devCompleteCase(definition);
      return {
        ok: true,
        message: `Case 001 resolved at ${definition.scoring.maximumScore}/100.`,
      };
    },
  },
  {
    id: 'jump-to-report',
    label: 'JUMP TO CASE REPORT',
    description:
      'Resolves the case if needed and opens the closing report sequence.',
    category: 'case',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      const store = useCaseSessionStore.getState();
      if (!store.sessions[definition.id]?.resolution) {
        store.devCompleteCase(definition);
      }
      router.dismissAll();
      router.replace('/investigation');
      return { ok: true, message: 'Opened the case report.' };
    },
  },
  {
    id: 'add-all-evidence',
    label: 'ADD ALL EVIDENCE',
    description:
      'Puts every artifact in the inventory. Scenes stay unvisited and nothing is marked read.',
    category: 'evidence',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      ensureStarted(definition);
      useCaseSessionStore.getState().devAddAllEvidence(definition);
      return {
        ok: true,
        message: `${definition.investigation.evidence.length} artifacts added.`,
      };
    },
  },
  {
    id: 'unlock-all-evidence',
    label: 'UNLOCK ALL EVIDENCE',
    description:
      'Full access: every scene entered, every artifact discovered and marked read.',
    category: 'evidence',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      ensureStarted(definition);
      useCaseSessionStore.getState().devUnlockAllEvidence(definition);
      return {
        ok: true,
        message: `${definition.investigation.scenes.length} scenes and ${definition.investigation.evidence.length} artifacts unlocked.`,
      };
    },
  },
  {
    id: 'reset-board',
    label: 'RESET EVIDENCE BOARD',
    description:
      'Empties the wall: placements, strings, groups, theories, and viewport.',
    category: 'board',
    destructive: true,
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      useCaseSessionStore.getState().devResetBoard(CASE_ID);
      return { ok: true, message: 'Evidence board cleared.' };
    },
  },
  {
    id: 'test-connections',
    label: 'CREATE TEST CONNECTIONS',
    description:
      'Pins eight strings across discovered artifacts, through the engine.',
    category: 'board',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      ensureStarted(definition);
      dispatch(definition, { type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' });

      const ids = discoveredIds();
      if (ids.length < 4) {
        return {
          ok: false,
          message: 'Fewer than four artifacts discovered. Add evidence first.',
        };
      }

      const kinds = ['related', 'supports', 'sequence'] as const;
      let made = 0;
      for (let index = 0; index + 1 < ids.length && made < 8; index += 2) {
        const result = dispatch(definition, {
          type: 'CONNECT_EVIDENCE',
          fromEvidenceId: ids[index]!,
          toEvidenceId: ids[index + 1]!,
          kind: kinds[made % kinds.length]!,
        });
        if (result.ok) made += 1;
      }
      return { ok: made > 0, message: `${made} test strings pinned.` };
    },
  },
  {
    id: 'simulate-contradiction',
    label: 'SIMULATE CONTRADICTION',
    description:
      'Marks a contradiction between two discovered artifacts to exercise the red-string path.',
    category: 'board',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      const definition = requireCase();
      if (!definition) return { ok: false, message: 'Case 001 is not installed.' };
      ensureStarted(definition);
      dispatch(definition, { type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' });

      const ids = discoveredIds();
      if (ids.length < 2) {
        return { ok: false, message: 'Two artifacts are needed. Add evidence first.' };
      }
      const result = dispatch(definition, {
        type: 'CONNECT_EVIDENCE',
        fromEvidenceId: ids[0]!,
        toEvidenceId: ids[1]!,
        kind: 'contradicts',
      });
      return result.ok
        ? { ok: true, message: 'Contradiction marked between the first two artifacts.' }
        : { ok: false, message: result.error.message };
    },
  },
  {
    id: 'simulate-premium',
    label:
      getDeveloperGrantPreset('premium-complete')?.label ??
      'SIMULATE PREMIUM ENTITLEMENT',
    description:
      getDeveloperGrantPreset('premium-complete')?.description ??
      'Grants the premium collection locally. No purchase is made.',
    category: 'account',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      // Named preset, not a literal id: the mapping lives with the catalog.
      return applyDeveloperGrant('premium-complete');
    },
  },
  {
    id: 'simulate-season',
    label: getDeveloperGrantPreset('season-one')?.label ?? 'SIMULATE SEASON ONE',
    description:
      getDeveloperGrantPreset('season-one')?.description ??
      'Grants the first season only, to test partial ownership.',
    category: 'account',
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      return applyDeveloperGrant('season-one');
    },
  },
  {
    id: 'revoke-premium',
    label: 'REVOKE ALL ENTITLEMENTS',
    description:
      'Drops every grant. Case 001 stays playable because it is bundled, not granted.',
    category: 'account',
    destructive: true,
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      return revokeAllDeveloperGrants();
    },
  },
  {
    id: 'clear-save',
    label: 'CLEAR LOCAL SAVE',
    description:
      'Wipes sessions, profile, entitlements, and shell position, then flushes to disk.',
    category: 'account',
    destructive: true,
    run: () => {
      if (!DEV_TOOLS_ENABLED) return blocked;
      useCaseSessionStore.getState().resetCaseSessions();
      usePlayerProfileStore.getState().resetProfile();
      revokeAllDeveloperGrants();
      useAppStore.getState().resetShell();
      void autosaveStorage.flush();
      return { ok: true, message: 'Local save cleared and flushed.' };
    },
  },
];

export function runQATool(toolId: string): QAToolResult {
  if (!DEV_TOOLS_ENABLED) return blocked;
  const tool = QA_TOOLS.find((candidate) => candidate.id === toolId);
  if (!tool) return { ok: false, message: `No such tool: ${toolId}.` };
  return tool.run();
}

export const QA_CATEGORY_LABELS: Readonly<Record<QAToolCategory, string>> = {
  case: 'CASE STATE',
  evidence: 'EVIDENCE',
  board: 'EVIDENCE BOARD',
  account: 'SAVE AND ENTITLEMENTS',
  spoiler: 'CANONICAL TRUTH',
};
