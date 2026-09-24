import type { AudioCueId } from '@/core/audio/audioCatalog';

import type {
  CaseAction,
  CaseDefinition,
  CasePlayerState,
} from '@/case-engine';

/**
 * Pure description of what a player deserves to feel after a state
 * transition. No React, no native modules, no timers: the UI layer decides
 * how to play it, this module only decides what happened and how loud it was.
 */

export type FeedbackHaptic =
  | 'none'
  | 'selection'
  | 'placement'
  | 'discovery'
  | 'connection'
  | 'contradiction'
  | 'confirmation'
  | 'completion';

export type FeedbackKind =
  | 'discovery'
  | 'placement'
  | 'connection'
  | 'contradiction'
  | 'deduction'
  | 'timeline'
  | 'message'
  | 'hint'
  | 'completion';

export interface FeedbackEvent {
  readonly kind: FeedbackKind;
  readonly haptic: FeedbackHaptic;
  /** The single cue this transition is allowed to play. `null` = silence. */
  readonly sound: AudioCueId | null;
  /** Short uppercase banner label. `null` means: haptic only, no banner. */
  readonly title: string | null;
  readonly detail: string | null;
}

export function describeTransition(
  definition: CaseDefinition,
  previous: CasePlayerState,
  next: CasePlayerState,
  action: CaseAction,
): FeedbackEvent | null {
  if (previous === next) return null;

  // Case completion outranks everything else in the same transition.
  if (!previous.resolution && next.resolution) {
    return {
      kind: 'completion',
      haptic: 'completion',
      sound: 'completion-case-closed',
      title: 'CASE CLOSED',
      detail: `Final assessment ${next.resolution.score}/100`,
    };
  }

  if (next.evidenceConnections.length > previous.evidenceConnections.length) {
    const added = next.evidenceConnections[next.evidenceConnections.length - 1];
    if (added?.kind === 'contradicts') {
      return {
        kind: 'contradiction',
        haptic: 'contradiction',
        sound: 'investigation-contradiction',
        title: 'CONTRADICTION MARKED',
        detail: 'Two accounts cannot both hold.',
      };
    }
    return {
      kind: 'connection',
      haptic: 'connection',
      sound: 'ui-tap',
      title: 'STRING PINNED',
      detail: added ? added.kind.toUpperCase() : null,
    };
  }

  const newlyDiscovered =
    next.discoveredEvidenceIds.length - previous.discoveredEvidenceIds.length;
  if (newlyDiscovered > 0) {
    const latestId =
      next.discoveredEvidenceIds[next.discoveredEvidenceIds.length - 1];
    const latest = definition.investigation.evidence.find(
      (item) => item.id === latestId,
    );
    return {
      kind: 'discovery',
      haptic: 'discovery',
      sound: 'ui-document-open',
      title: newlyDiscovered === 1 ? 'EVIDENCE RECOVERED' : 'EVIDENCE RECOVERED',
      detail:
        newlyDiscovered === 1
          ? (latest?.title ?? null)
          : `${newlyDiscovered} artifacts filed`,
    };
  }

  if (next.solvedDeductionIds.length > previous.solvedDeductionIds.length) {
    return {
      kind: 'deduction',
      haptic: 'confirmation',
      sound: 'investigation-timeline-confirm',
      title: 'DEDUCTION PROVEN',
      detail: `${next.solvedDeductionIds.length} of ${definition.investigation.deductions.length} confirmed`,
    };
  }

  if (
    next.pinnedTimelineEventIds.length > previous.pinnedTimelineEventIds.length
  ) {
    return {
      kind: 'timeline',
      haptic: 'confirmation',
      sound: 'investigation-timeline-confirm',
      title: 'TIMELINE CONFIRMED',
      detail: `${next.pinnedTimelineEventIds.length} pinned`,
    };
  }

  if (next.hintsUsed.length > previous.hintsUsed.length) {
    return {
      kind: 'hint',
      haptic: 'selection',
      sound: 'ui-drawer',
      title: 'HINT SPENT',
      detail: 'Recorded against the final assessment.',
    };
  }

  if (action.type === 'MOVE_EVIDENCE_ON_BOARD') {
    return {
      kind: 'placement',
      haptic: 'placement',
      sound: 'ui-evidence-place',
      title: null,
      detail: null,
    };
  }

  if (
    action.type === 'VIEW_EVIDENCE' &&
    !previous.viewedEvidenceIds.includes(action.evidenceId) &&
    next.viewedEvidenceIds.includes(action.evidenceId)
  ) {
    const opened = definition.investigation.evidence.find(
      (item) => item.id === action.evidenceId,
    );
    if (opened?.type === 'message' || opened?.type === 'email') {
      return {
        kind: 'message',
        haptic: 'selection',
        sound: 'ui-paper',
        title: null,
        detail: null,
      };
    }
  }

  return null;
}
