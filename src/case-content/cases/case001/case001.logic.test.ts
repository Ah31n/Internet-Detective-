import { describe, expect, it } from 'vitest';

import {
  createInitialCasePlayerState,
  createInvestigationViewModel,
  EVIDENCE_NOTE_MAX_LENGTH,
  transitionCase,
  type CaseAction,
  type CaseDefinition,
  type CasePlayerState,
  type EvidenceDefinition,
} from '../../../case-engine';

import { CASE_001 } from './case001.definition';
import { CASE001_SOLUTION_RECORD } from './case001.solution';

/**
 * PHASE 9.5 — LOGIC VALIDATION.
 * These tests exist to prove that Case 001 is genuinely solvable, internally
 * consistent, and exclusive: exactly one suspect survives the evidence chain.
 */

const definition: CaseDefinition = CASE_001;
const investigation = definition.investigation;
const evidenceById = new Map<string, EvidenceDefinition>(
  investigation.evidence.map((item) => [item.id, item]),
);
const cctvSources = investigation.evidence.filter((item) => item.type === 'cctv');

function apply(state: CasePlayerState, action: CaseAction) {
  const result = transitionCase(CASE_001, state, action);
  expect(result.ok, JSON.stringify(action)).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function parseClock(label: string): number {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(label.trim());
  expect(match, `unparsable clock label "${label}"`).not.toBeNull();
  const [, hours = '0', minutes = '0', seconds = '0'] = match!;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function canonicalPlaythrough(): CasePlayerState {
  let state = createInitialCasePlayerState(CASE_001);
  state = apply(state, { type: 'BEGIN_INVESTIGATION' });
  state = apply(state, {
    type: 'VIEW_EVIDENCE',
    evidenceId: 'evidence-photo-replica-macro',
  });

  for (const sceneId of [
    'scene-grand-rotunda',
    'scene-security-annex',
    'scene-restoration-lab',
    'scene-auction-lounge',
    'scene-roof-terrace',
    'scene-press-alcove',
  ] as const) {
    state = apply(state, { type: 'VISIT_SCENE', sceneId });
  }

  for (const [siteId, pageId] of [
    ['site-hartwell-museum', 'hartwell-event'],
    ['site-lydon-ledger', 'ledger-rook-trust'],
    ['site-neighbourwire', 'neighbour-van-thread'],
    ['site-prism-props', 'prism-catalog'],
    ['site-prism-props', 'prism-order-4417'],
    ['site-nia-fieldnotes', 'nia-hartwell-take'],
    ['site-channel-eight', 'channel-gala'],
  ] as const) {
    state = apply(state, { type: 'OPEN_INTERNET_PAGE', siteId, pageId });
  }

  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-camera-replay',
    evidenceIds: ['evidence-cctv-gallery', 'evidence-doc-camera-hash'],
  });
  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-cloned-credential',
    evidenceIds: [
      'evidence-email-badge-alert',
      'evidence-doc-admin-audit',
      'evidence-doc-restoration-log',
    ],
  });
  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-replica-source',
    evidenceIds: [
      'evidence-photo-replica-macro',
      'evidence-receipt-prism-replica',
      'evidence-email-replica-order',
    ],
  });
  state = apply(state, { type: 'VISIT_SCENE', sceneId: 'scene-east-corridor' });
  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-service-route',
    evidenceIds: [
      'evidence-cctv-east-corridor',
      'evidence-photo-navy-fiber',
      'evidence-photo-toolmarks',
    ],
  });
  state = apply(state, { type: 'VISIT_SCENE', sceneId: 'scene-forensics-bench' });
  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-ward-connection',
    evidenceIds: [
      'evidence-message-adrian-elias',
      'evidence-email-elias-consignment',
      'evidence-receipt-transfer',
    ],
  });
  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-executor-motive',
    evidenceIds: [
      'evidence-doc-cross-debt',
      'evidence-message-adrian-elias',
      'evidence-email-insurance-rider',
      'evidence-web-vane-finances',
    ],
  });
  state = apply(state, { type: 'VISIT_SCENE', sceneId: 'scene-loading-lockers' });
  state = apply(state, {
    type: 'SUBMIT_DEDUCTION',
    deductionId: 'deduction-diamond-cache',
    evidenceIds: [
      'evidence-photo-keyring',
      'evidence-doc-radio-inventory',
      'evidence-receipt-locker-service',
    ],
  });

  return state;
}

describe('CASE 001 — timeline consistency', () => {
  it('has unique, ordered, parsable timestamps', () => {
    const sortOrders = investigation.timeline.map((event) => event.sortOrder);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);

    const ids = investigation.timeline.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);

    let previousSortOrder = Number.NEGATIVE_INFINITY;
    let previousClock = Number.NEGATIVE_INFINITY;
    for (const event of investigation.timeline) {
      const clock = parseClock(event.timeLabel);
      expect(event.sortOrder, `${event.id} sort order`).toBeGreaterThan(previousSortOrder);
      expect(clock, `${event.id} clock order`).toBeGreaterThanOrEqual(previousClock);
      previousSortOrder = event.sortOrder;
      previousClock = clock;
    }
  });

  it('sources every timeline event from real evidence', () => {
    for (const event of investigation.timeline) {
      expect(event.sourceEvidenceIds.length, event.id).toBeGreaterThan(0);
      for (const evidenceId of event.sourceEvidenceIds) {
        expect(evidenceById.has(evidenceId), `${event.id} → ${evidenceId}`).toBe(true);
      }
    }
  });

  it('keeps every CCTV recording window and marker internally consistent', () => {
    expect(cctvSources).toHaveLength(4);

    for (const item of cctvSources) {
      const match = /^(\d{2}:\d{2}:\d{2})[–-](\d{2}:\d{2}:\d{2})/.exec(item.recordedAtLabel ?? '');
      expect(match, `${item.id} recording label`).not.toBeNull();
      const span = parseClock(match![2] ?? '') - parseClock(match![1] ?? '');
      expect(span, `${item.id} duration`).toBe(item.durationSeconds);

      let previousOffset = -1;
      for (const marker of item.markers) {
        expect(marker.offsetSeconds, `${item.id} · ${marker.id}`).toBeGreaterThan(previousOffset);
        expect(marker.offsetSeconds, `${item.id} · ${marker.id}`).toBeLessThanOrEqual(
          item.durationSeconds,
        );
        previousOffset = marker.offsetSeconds;
      }
    }
  });

  it('places the substitution window inside every camera that observes it', () => {
    const windowStart = parseClock('21:17:43');
    const windowEnd = parseClock('21:21:04');

    for (const camera of cctvSources) {
      const match = /^(\d{2}:\d{2}:\d{2})[–-](\d{2}:\d{2}:\d{2})/.exec(
        camera.recordedAtLabel ?? '',
      )!;
      expect(
        parseClock(match[1] ?? ''),
        `${camera.id} starts before the window`,
      ).toBeLessThan(windowStart);
      expect(
        parseClock(match[2] ?? ''),
        `${camera.id} ends after the window`,
      ).toBeGreaterThan(windowEnd);
    }
  });
});

describe('CASE 001 — suspects and exclusivity', () => {
  it('excludes every suspect except the canonical executor with evidence', () => {
    const exclusions = CASE001_SOLUTION_RECORD.exclusions as Record<string, string>;
    const nonExecutors = investigation.suspects
      .map((suspect) => String(suspect.id))
      .filter((id) => id !== String(CASE001_SOLUTION_RECORD.perpetratorId));

    expect(Object.keys(exclusions).sort()).toEqual([...nonExecutors].sort());
    for (const [suspectId, reason] of Object.entries(exclusions)) {
      expect(reason.length, suspectId).toBeGreaterThan(80);
      expect(/\d{2}:\d{2}/.test(reason), `${suspectId} cites a timestamp or record`).toBe(true);
    }
  });

  it('gives the broker a recorded location covering the substitution window', () => {
    const callRecord = evidenceById.get('evidence-doc-lounge-call-record');
    expect(callRecord?.type).toBe('document');

    const text = JSON.stringify(callRecord);
    expect(text).toContain('21:14:06');
    expect(text).toContain('21:22:58');
  });

  it('keeps every suspect plausible with an authored alibi and motive surface', () => {
    for (const suspect of investigation.suspects) {
      expect(suspect.statedAlibi.length, suspect.id).toBeGreaterThan(30);
      const appearsInTimeline = investigation.timeline.some((event) =>
        event.suspectIds.includes(suspect.id),
      );
      expect(appearsInTimeline, `${suspect.id} appears in the timeline`).toBe(true);
    }
  });
});

describe('CASE 001 — solvability and spoiler boundary', () => {
  it('makes every authored evidence item discoverable in play', () => {
    const discoverable = new Set<string>(investigation.startingEvidenceIds);
    for (const scene of investigation.scenes) {
      scene.revealsEvidenceIds.forEach((id) => discoverable.add(id));
    }
    for (const site of investigation.internet.sites) {
      for (const page of site.pages) {
        page.revealsEvidenceIds.forEach((id) => discoverable.add(id));
      }
    }

    for (const item of investigation.evidence) {
      expect(discoverable.has(item.id), `${item.id} is reachable`).toBe(true);
    }
  });

  it('withholds the conspiracy channel until the physical route is proven', () => {
    const openingScenes = investigation.scenes.filter((scene) => !scene.openWhen);
    const openingEvidence = new Set(
      openingScenes.flatMap((scene) => scene.revealsEvidenceIds as readonly string[]),
    );

    for (const gatedEvidenceId of [
      'evidence-message-adrian-elias',
      'evidence-doc-cross-debt',
      'evidence-photo-recovered-asterion',
    ] as const) {
      expect(openingEvidence.has(gatedEvidenceId), gatedEvidenceId).toBe(false);
    }

    const forensicsScene = investigation.scenes.find(
      (scene) => scene.id === 'scene-forensics-bench',
    )!;
    expect(forensicsScene.openWhen).toEqual({
      kind: 'deductionSolved',
      deductionId: 'deduction-service-route',
    });
  });

  it('requires independent chains rather than one decisive clue', () => {
    const solutions = definition.canonicalTruth.deductionSolutions;
    const required = definition.canonicalTruth.requiredDeductionIds;
    expect(required.length).toBeGreaterThanOrEqual(7);

    const usage = new Map<string, number>();
    for (const deductionId of required) {
      const solution = solutions[deductionId];
      expect(solution, deductionId).toBeDefined();
      expect(solution!.requiredEvidenceIds.length).toBeGreaterThanOrEqual(2);
      for (const evidenceId of solution!.requiredEvidenceIds) {
        usage.set(evidenceId, (usage.get(evidenceId) ?? 0) + 1);
      }
    }

    // No single artifact can carry more than two required conclusions.
    for (const [evidenceId, count] of usage) {
      expect(count, evidenceId).toBeLessThanOrEqual(2);
    }

    // Every required conclusion mixes independent sources.
    for (const deductionId of required) {
      const sources = new Set(
        (solutions[deductionId]?.requiredEvidenceIds ?? []).map(
          (evidenceId) => evidenceById.get(evidenceId)!.type,
        ),
      );
      expect(sources.size, `${deductionId} mixes evidence types`).toBeGreaterThanOrEqual(2);
    }
  });

  it('locks the accusation until every required conclusion is proven', () => {
    let state = createInitialCasePlayerState(CASE_001);
    state = apply(state, { type: 'BEGIN_INVESTIGATION' });
    const earlyView = createInvestigationViewModel(CASE_001, state);
    expect(earlyView.accusation).toBeNull();

    const blocked = transitionCase(CASE_001, state, {
      type: 'SUBMIT_ACCUSATION',
      answers: {
        'question-thief': 'answer-adrian-cross',
        'question-accomplice': 'answer-elias-ward',
        'question-method': 'answer-replay-service-hatch',
        'question-hiding-place': 'answer-radio-r17',
        'question-motive': 'answer-private-debt',
      },
    });
    expect(blocked.ok).toBe(false);
  });

  it('rejects the strongest alternative theory and accepts only the canonical one', () => {
    const solved = canonicalPlaythrough();

    const wrongExecutor = transitionCase(CASE_001, solved, {
      type: 'SUBMIT_ACCUSATION',
      answers: {
        'question-thief': 'answer-elias-ward-thief',
        'question-accomplice': 'answer-elias-ward',
        'question-method': 'answer-replay-service-hatch',
        'question-hiding-place': 'answer-radio-r17',
        'question-motive': 'answer-private-debt',
      },
    });
    expect(wrongExecutor.ok).toBe(true);
    if (!wrongExecutor.ok) throw new Error('unreachable');
    expect(wrongExecutor.state.phase).toBe('investigating');
    expect(wrongExecutor.state.resolution).toBeNull();

    const wrongMotive = transitionCase(CASE_001, solved, {
      type: 'SUBMIT_ACCUSATION',
      answers: {
        'question-thief': 'answer-adrian-cross',
        'question-accomplice': 'answer-elias-ward',
        'question-method': 'answer-replay-service-hatch',
        'question-hiding-place': 'answer-radio-r17',
        'question-motive': 'answer-insurance-fraud',
      },
    });
    expect(wrongMotive.ok).toBe(true);
    if (!wrongMotive.ok) throw new Error('unreachable');
    expect(wrongMotive.state.resolution).toBeNull();

    const resolved = apply(solved, {
      type: 'SUBMIT_ACCUSATION',
      answers: {
        'question-thief': 'answer-adrian-cross',
        'question-accomplice': 'answer-elias-ward',
        'question-method': 'answer-replay-service-hatch',
        'question-hiding-place': 'answer-radio-r17',
        'question-motive': 'answer-private-debt',
      },
    });
    expect(resolved.phase).toBe('resolved');
    expect(resolved.resolution).toEqual(
      expect.objectContaining({ correct: true, score: 100 }),
    );
  });

  it('never leaks sealed authoring material into the player view model', () => {
    const solvedView = createInvestigationViewModel(CASE_001, canonicalPlaythrough());
    const serialized = JSON.stringify(solvedView);

    expect(solvedView).not.toHaveProperty('canonicalTruth');
    expect(serialized).not.toContain(CASE001_SOLUTION_RECORD.method);
    expect(serialized).not.toContain(CASE001_SOLUTION_RECORD.concealment);
    expect(serialized).not.toContain('perpetratorId');
    expect(serialized).not.toContain('requiredEvidenceIds');
    expect(serialized).not.toContain('correct');
  });
});

describe('CASE 001 — persistent player-state actions', () => {
  function investigating(): CasePlayerState {
    let state = createInitialCasePlayerState(CASE_001);
    state = apply(state, { type: 'BEGIN_INVESTIGATION' });
    return apply(state, { type: 'VISIT_SCENE', sceneId: 'scene-security-annex' });
  }

  it('stores, edits, and clears an evidence note', () => {
    let state = investigating();
    state = apply(state, {
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: 'evidence-doc-camera-hash',
      text: '  Repeated frames 21:17:31 → 21:19:01.  ',
    });
    expect(state.evidenceNotes['evidence-doc-camera-hash']?.text).toBe(
      'Repeated frames 21:17:31 → 21:19:01.',
    );

    state = apply(state, {
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: 'evidence-doc-camera-hash',
      text: '',
    });
    expect(state.evidenceNotes['evidence-doc-camera-hash']).toBeUndefined();
  });

  it('rejects notes on undiscovered evidence and oversized notes', () => {
    const state = investigating();

    const undiscovered = transitionCase(CASE_001, state, {
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: 'evidence-photo-recovered-asterion',
      text: 'too early',
    });
    expect(undiscovered.ok).toBe(false);

    const oversized = transitionCase(CASE_001, state, {
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: 'evidence-doc-camera-hash',
      text: 'x'.repeat(EVIDENCE_NOTE_MAX_LENGTH + 1),
    });
    expect(oversized.ok).toBe(false);
  });

  it('pins only verified timeline events', () => {
    let state = investigating();

    const locked = transitionCase(CASE_001, state, {
      type: 'SET_TIMELINE_EVENT_PINNED',
      timelineEventId: 'timeline-2340-recovery',
      pinned: true,
    });
    expect(locked.ok).toBe(false);

    state = apply(state, {
      type: 'SET_TIMELINE_EVENT_PINNED',
      timelineEventId: 'timeline-2052-credential-clone',
      pinned: true,
    });
    expect(state.pinnedTimelineEventIds).toEqual(['timeline-2052-credential-clone']);

    state = apply(state, {
      type: 'SET_TIMELINE_EVENT_PINNED',
      timelineEventId: 'timeline-2052-credential-clone',
      pinned: false,
    });
    expect(state.pinnedTimelineEventIds).toEqual([]);
  });

  it('reveals a hint only after it is spent, and never leaks unspent hint text', () => {
    let state = investigating();

    const closed = transitionCase(CASE_001, state, {
      type: 'USE_HINT',
      deductionId: 'deduction-diamond-cache',
    });
    expect(closed.ok).toBe(false);

    const beforeSpend = createInvestigationViewModel(CASE_001, state).availableDeductions.find(
      (deduction) => deduction.id === 'deduction-camera-replay',
    )!;
    expect(beforeSpend.hintAvailable).toBe(true);
    expect(beforeSpend.hintUsed).toBe(false);
    expect(beforeSpend.hint).toBeNull();

    state = apply(state, { type: 'USE_HINT', deductionId: 'deduction-camera-replay' });
    const afterSpend = createInvestigationViewModel(CASE_001, state).availableDeductions.find(
      (deduction) => deduction.id === 'deduction-camera-replay',
    )!;
    expect(afterSpend.hintUsed).toBe(true);
    expect(afterSpend.hint).toBeTruthy();
    expect(state.hintsUsed).toHaveLength(1);
  });

  it('applies the authored hint penalty to the final score', () => {
    const state = canonicalPlaythrough();
    const withHint = apply(state, {
      type: 'USE_HINT',
      deductionId: 'deduction-camera-replay',
    });
    const resolved = apply(withHint, {
      type: 'SUBMIT_ACCUSATION',
      answers: {
        'question-thief': 'answer-adrian-cross',
        'question-accomplice': 'answer-elias-ward',
        'question-method': 'answer-replay-service-hatch',
        'question-hiding-place': 'answer-radio-r17',
        'question-motive': 'answer-private-debt',
      },
    });
    expect(resolved.resolution?.score).toBe(100 - (CASE_001.scoring.hintPenalty ?? 0));
  });
});
