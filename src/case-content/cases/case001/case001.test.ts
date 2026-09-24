import { describe, expect, it } from 'vitest';

import {
  createInitialCasePlayerState,
  createInvestigationViewModel,
  transitionCase,
  validateCaseDefinition,
  type CaseAction,
  type CasePlayerState,
} from '../../../case-engine';

import { CASE001_EVIDENCE_DEPENDENCIES } from './case001.dependencies';
import { CASE_001 } from './case001.definition';
import { CASE001_SOLUTION_RECORD } from './case001.solution';

function apply(state: CasePlayerState, action: CaseAction) {
  const result = transitionCase(CASE_001, state, action);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe('CASE 001 — THE MISSING DIAMOND', () => {
  it('is a complete valid production definition', () => {
    expect(validateCaseDefinition(CASE_001)).toEqual([]);
    expect(CASE001_SOLUTION_RECORD.deterministicSequence.length).toBeGreaterThanOrEqual(10);
    expect(CASE001_SOLUTION_RECORD.method.length).toBeGreaterThan(80);
    expect(CASE001_SOLUTION_RECORD.concealment.length).toBeGreaterThan(60);
  });

  it('meets the authored case-content inventory', () => {
    const investigation = CASE_001.investigation;
    const count = (type: (typeof investigation.evidence)[number]['type']) =>
      investigation.evidence.filter((evidence) => evidence.type === type).length;

    expect(investigation.suspects).toHaveLength(6);
    expect(investigation.locations.length).toBeGreaterThanOrEqual(5);
    expect(investigation.evidence.length).toBeGreaterThanOrEqual(30);
    expect(investigation.timeline.length).toBeGreaterThanOrEqual(15);
    expect(count('message')).toBeGreaterThanOrEqual(4);
    expect(count('message')).toBeLessThanOrEqual(6);
    expect(count('email')).toBeGreaterThanOrEqual(5);
    expect(count('email')).toBeLessThanOrEqual(8);
    expect(investigation.internet.sites.length).toBeGreaterThanOrEqual(5);
    expect(count('cctv')).toBe(4);
    expect(count('document')).toBeGreaterThanOrEqual(3);
    expect(count('receipt')).toBeGreaterThanOrEqual(3);
    expect(count('photo')).toBeGreaterThan(1);
    expect(investigation.relationships.length).toBeGreaterThanOrEqual(5);
  });

  it('builds every solution dependency from authored evidence', () => {
    const evidenceIds = new Set(
      CASE_001.investigation.evidence.map((evidence) => evidence.id),
    );
    for (const stage of CASE001_EVIDENCE_DEPENDENCIES) {
      expect(stage.requiredEvidenceIds.length).toBeGreaterThan(0);
      for (const evidenceId of stage.requiredEvidenceIds) {
        expect(evidenceIds.has(evidenceId), `${stage.id}: ${evidenceId}`).toBe(true);
      }
    }

    const canonicalEvidenceIds = Object.values(
      CASE_001.canonicalTruth.deductionSolutions,
    ).flatMap((solution) => solution.requiredEvidenceIds);
    expect(
      canonicalEvidenceIds.every((evidenceId) => evidenceIds.has(evidenceId)),
    ).toBe(true);
  });

  it('has a deterministic, logically gated path from briefing to recovery', () => {
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
    ]) {
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
      evidenceIds: ['evidence-doc-camera-hash', 'evidence-cctv-gallery'],
    });
    state = apply(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-cloned-credential',
      evidenceIds: [
        'evidence-doc-restoration-log',
        'evidence-email-badge-alert',
        'evidence-doc-admin-audit',
      ],
    });
    state = apply(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-replica-source',
      evidenceIds: [
        'evidence-email-replica-order',
        'evidence-photo-replica-macro',
        'evidence-receipt-prism-replica',
      ],
    });
    state = apply(state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-east-corridor',
    });
    state = apply(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-service-route',
      evidenceIds: [
        'evidence-photo-toolmarks',
        'evidence-cctv-east-corridor',
        'evidence-photo-navy-fiber',
      ],
    });
    state = apply(state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-forensics-bench',
    });
    state = apply(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-ward-connection',
      evidenceIds: [
        'evidence-receipt-transfer',
        'evidence-message-adrian-elias',
        'evidence-email-elias-consignment',
      ],
    });
    state = apply(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-executor-motive',
      evidenceIds: [
        'evidence-web-vane-finances',
        'evidence-doc-cross-debt',
        'evidence-email-insurance-rider',
        'evidence-message-adrian-elias',
      ],
    });
    state = apply(state, {
      type: 'VISIT_SCENE',
      sceneId: 'scene-loading-lockers',
    });
    state = apply(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-diamond-cache',
      evidenceIds: [
        'evidence-receipt-locker-service',
        'evidence-photo-keyring',
        'evidence-doc-radio-inventory',
      ],
    });

    const preAccusationView = createInvestigationViewModel(CASE_001, state);
    expect(preAccusationView).not.toHaveProperty('canonicalTruth');
    expect(preAccusationView.accusation).not.toBeNull();
    expect(
      preAccusationView.accusation?.questions
        .flatMap((question) => question.options)
        .some((option) => 'correct' in option),
    ).toBe(false);
    expect(state.discoveredEvidenceIds).toContain(
      'evidence-photo-recovered-asterion',
    );

    state = apply(state, {
      type: 'SUBMIT_ACCUSATION',
      answers: {
        'question-thief': 'answer-adrian-cross',
        'question-accomplice': 'answer-elias-ward',
        'question-method': 'answer-replay-service-hatch',
        'question-hiding-place': 'answer-radio-r17',
        'question-motive': 'answer-private-debt',
      },
    });

    expect(state.phase).toBe('resolved');
    expect(state.resolution).toEqual(
      expect.objectContaining({ correct: true, score: 100 }),
    );
  });
});
