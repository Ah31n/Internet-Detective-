import type { CaseDefinition, CasePlayerState } from '@/case-engine';
import type { EntitlementGrant } from '@/core/commerce';

/**
 * QA INSPECTORS
 *
 * Read-only views of live state, built as plain data so the console renders a
 * list and the shapes can be asserted in a test without mounting anything.
 *
 * Pure functions on purpose: they take the state they describe rather than
 * reaching into stores, which is also what keeps them out of the production
 * graph — nothing imports them except the QA console.
 */

export interface InspectorRow {
  label: string;
  value: string;
  /** Extra detail printed small beneath the value. */
  detail?: string;
}

export interface InspectorSection {
  id: string;
  title: string;
  rows: readonly InspectorRow[];
  /** Shown instead of rows when there is nothing to report. */
  empty?: string;
}

const yesNo = (value: boolean) => (value ? 'YES' : 'NO');

/** Every evidence id in the case, with its type and whether it is held. */
export function inspectEvidenceIds(
  definition: CaseDefinition,
  state: CasePlayerState | null,
): InspectorSection {
  const discovered = state?.discoveredEvidenceIds ?? [];
  const viewed = state?.viewedEvidenceIds ?? [];

  return {
    id: 'evidence-ids',
    title: `EVIDENCE IDS · ${definition.investigation.evidence.length}`,
    rows: definition.investigation.evidence.map((evidence) => ({
      label: evidence.id,
      value: discovered.includes(evidence.id)
        ? viewed.includes(evidence.id)
          ? 'HELD · READ'
          : 'HELD'
        : 'NOT FOUND',
      detail: `${evidence.type} · ${evidence.title}`,
    })),
  };
}

export function inspectCaseState(
  definition: CaseDefinition,
  state: CasePlayerState | null,
): InspectorSection {
  if (!state) {
    return {
      id: 'case-state',
      title: 'CASE STATE',
      rows: [],
      empty: 'No session. Activate the case first.',
    };
  }

  return {
    id: 'case-state',
    title: 'CASE STATE',
    rows: [
      { label: 'case id', value: state.caseId },
      {
        label: 'content version',
        value: `${state.contentVersion}`,
        detail:
          state.contentVersion === definition.contentVersion
            ? 'matches the installed definition'
            : `MISMATCH — definition is v${definition.contentVersion}`,
      },
      { label: 'phase', value: state.phase.toUpperCase() },
      { label: 'turn', value: `${state.turn}` },
      { label: 'current scene', value: state.currentSceneId ?? '—' },
      {
        label: 'scenes visited',
        value: `${state.visitedSceneIds.length} / ${definition.investigation.scenes.length}`,
      },
      {
        label: 'deductions solved',
        value: `${state.solvedDeductionIds.length} / ${definition.investigation.deductions.length}`,
      },
      { label: 'hints used', value: `${state.hintsUsed.length}` },
      {
        label: 'resolution',
        value: state.resolution
          ? `RESOLVED · ${state.resolution.score}/100`
          : 'UNRESOLVED',
        detail: state.resolution
          ? `on turn ${state.resolution.resolvedOnTurn}`
          : undefined,
      },
    ],
  };
}

export function inspectPlayerState(
  definition: CaseDefinition,
  state: CasePlayerState | null,
): InspectorSection {
  if (!state) {
    return {
      id: 'player-state',
      title: 'PLAYER STATE',
      rows: [],
      empty: 'No session.',
    };
  }

  return {
    id: 'player-state',
    title: 'PLAYER STATE',
    rows: [
      {
        label: 'evidence discovered',
        value: `${state.discoveredEvidenceIds.length} / ${definition.investigation.evidence.length}`,
      },
      { label: 'evidence read', value: `${state.viewedEvidenceIds.length}` },
      { label: 'evidence referenced', value: `${state.referencedEvidenceIds.length}` },
      { label: 'notes written', value: `${Object.keys(state.evidenceNotes).length}` },
      { label: 'strings pinned', value: `${state.evidenceConnections.length}` },
      {
        label: 'board placements',
        value: `${Object.keys(state.evidenceBoard.placements).length}`,
      },
      {
        label: 'viewport',
        value: `x ${Math.round(state.evidenceBoard.viewport.x)} · y ${Math.round(
          state.evidenceBoard.viewport.y,
        )} · ${state.evidenceBoard.viewport.scale.toFixed(2)}×`,
      },
      {
        label: 'pages visited',
        value: `${state.fictionalInternet.visitedPageKeys.length}`,
        detail: `${state.fictionalInternet.bookmarkedPageKeys.length} bookmarked`,
      },
      {
        label: 'theory evidence',
        value: `${state.theoryEvidenceIds.length}`,
      },
    ],
  };
}

export function inspectTimelineState(
  definition: CaseDefinition,
  state: CasePlayerState | null,
): InspectorSection {
  const pinned = state?.pinnedTimelineEventIds ?? [];
  const discovered = state?.discoveredEvidenceIds ?? [];

  return {
    id: 'timeline-state',
    title: `TIMELINE · ${pinned.length} PINNED OF ${definition.investigation.timeline.length}`,
    rows: definition.investigation.timeline.map((event) => {
      // An event is legible once any artifact that sources it is held.
      const known =
        event.sourceEvidenceIds.length === 0 ||
        event.sourceEvidenceIds.some((id) => discovered.includes(id));
      return {
        label: event.id,
        value: pinned.includes(event.id) ? 'PINNED' : known ? 'KNOWN' : 'HIDDEN',
        detail: `${event.timeLabel} · ${event.title}`,
      };
    }),
  };
}

export function inspectTheoryState(state: CasePlayerState | null): InspectorSection {
  const clusters = state?.evidenceBoard.theoryClusters ?? [];
  const groups = state?.evidenceBoard.groups ?? [];

  if (clusters.length === 0 && groups.length === 0) {
    return {
      id: 'theory-state',
      title: 'THEORIES AND GROUPS',
      rows: [],
      empty: 'Nothing grouped on the wall yet.',
    };
  }

  return {
    id: 'theory-state',
    title: `THEORIES AND GROUPS · ${clusters.length} / ${groups.length}`,
    rows: [
      ...clusters.map((cluster) => ({
        label: cluster.id,
        value: `THEORY · ${cluster.evidenceIds.length} artifacts`,
        detail: `${cluster.title} · turn ${cluster.createdOnTurn}`,
      })),
      ...groups.map((group) => ({
        label: group.id,
        value: `GROUP · ${group.evidenceIds.length} artifacts`,
        detail: `${group.label} · turn ${group.createdOnTurn}`,
      })),
    ],
  };
}

export function inspectConnectionState(
  state: CasePlayerState | null,
): InspectorSection {
  const connections = state?.evidenceConnections ?? [];
  if (connections.length === 0) {
    return {
      id: 'connection-state',
      title: 'STRINGS',
      rows: [],
      empty: 'No strings pinned.',
    };
  }

  return {
    id: 'connection-state',
    title: `STRINGS · ${connections.length}`,
    rows: connections.map((connection) => ({
      label: connection.kind.toUpperCase(),
      value: `${connection.fromEvidenceId} → ${connection.toEvidenceId}`,
      detail: `${connection.id} · turn ${connection.createdOnTurn}`,
    })),
  };
}

export function inspectEntitlementState(input: {
  grants: readonly EntitlementGrant[];
  billingEnvironment: string;
  billingAvailable: boolean;
  heldEntitlementIds: readonly string[];
}): InspectorSection {
  return {
    id: 'entitlement-state',
    title: `ENTITLEMENTS · ${input.heldEntitlementIds.length} HELD`,
    rows: [
      { label: 'billing adapter', value: input.billingEnvironment.toUpperCase() },
      { label: 'billing available', value: yesNo(input.billingAvailable) },
      {
        label: 'resolved claims',
        value: input.heldEntitlementIds.join(', ') || '—',
        detail: 'includes bundled claims and everything they expand to',
      },
      ...input.grants.map((grant) => ({
        label: grant.id,
        value: grant.source.toUpperCase(),
        detail: `${grant.productId ?? 'no product'} · ${new Date(
          grant.grantedAtEpochMs,
        ).toISOString()}`,
      })),
    ],
  };
}
