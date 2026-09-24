import type { CanonicalTruthDefinition } from '../../../case-engine';

/**
 * CANONICAL ANSWER KEY — ships in every build, by necessity.
 *
 * The engine scores deductions and the accusation against this, so it has to
 * be present at runtime. It is a table of identifiers: which evidence ids
 * satisfy which deduction, and which option id answers which question. It is
 * never rendered before a correct resolution.
 *
 * The *narrative* solution — motive, method, concealment, the step-by-step
 * sequence — deliberately does not live here. It is in `case001.solution.ts`,
 * which nothing in the shipped app imports, so that prose is absent from the
 * production binary entirely rather than merely unused inside it. Keep the two
 * apart: one import from a screen into the solution file would put the whole
 * answer back in the bundle, readable with `strings`.
 */
export const CASE001_CANONICAL_TRUTH = {
  deductionSolutions: {
    'deduction-camera-replay': {
      requiredEvidenceIds: [
        'evidence-cctv-gallery',
        'evidence-doc-camera-hash',
      ],
    },
    'deduction-cloned-credential': {
      requiredEvidenceIds: [
        'evidence-email-badge-alert',
        'evidence-doc-admin-audit',
        'evidence-doc-restoration-log',
      ],
    },
    'deduction-replica-source': {
      requiredEvidenceIds: [
        'evidence-photo-replica-macro',
        'evidence-receipt-prism-replica',
        'evidence-email-replica-order',
      ],
    },
    'deduction-service-route': {
      requiredEvidenceIds: [
        'evidence-cctv-east-corridor',
        'evidence-photo-navy-fiber',
        'evidence-photo-toolmarks',
      ],
    },
    'deduction-ward-connection': {
      requiredEvidenceIds: [
        'evidence-message-adrian-elias',
        'evidence-email-elias-consignment',
        'evidence-receipt-transfer',
      ],
    },
    'deduction-diamond-cache': {
      requiredEvidenceIds: [
        'evidence-photo-keyring',
        'evidence-doc-radio-inventory',
        'evidence-receipt-locker-service',
      ],
    },
    'deduction-executor-motive': {
      requiredEvidenceIds: [
        'evidence-doc-cross-debt',
        'evidence-message-adrian-elias',
        'evidence-email-insurance-rider',
        'evidence-web-vane-finances',
      ],
    },
  },
  accusationAnswers: {
    'question-thief': 'answer-adrian-cross',
    'question-accomplice': 'answer-elias-ward',
    'question-method': 'answer-replay-service-hatch',
    'question-hiding-place': 'answer-radio-r17',
    'question-motive': 'answer-private-debt',
  },
  requiredDeductionIds: [
    'deduction-camera-replay',
    'deduction-cloned-credential',
    'deduction-replica-source',
    'deduction-service-route',
    'deduction-ward-connection',
    'deduction-diamond-cache',
    'deduction-executor-motive',
  ],
  resolution: {
    headline: 'The Asterion recovered',
    summary:
      'The gallery image was a replay, the conservator credential was cloned, and the service hatch was opened with security equipment. The physical route, concealed payment, commissioned replica, and Locker B cache establish who performed the exchange and who arranged the sale. The diamond is recovered before the planned handoff.',
  },
} as const satisfies CanonicalTruthDefinition;
