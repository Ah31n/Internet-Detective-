import type { CaseCondition, EvidenceId } from '../../../case-engine';

export interface Case001DependencyStage {
  id: string;
  purpose: string;
  availableWhen?: CaseCondition;
  requiredEvidenceIds: readonly EvidenceId[];
  unlocks: readonly string[];
}

/**
 * SPOILER-SEALED authoring graph. This is testable content metadata, not a UI
 * model. Every canonical conclusion has an independent physical/digital chain.
 */
export const CASE001_EVIDENCE_DEPENDENCIES = [
  {
    id: 'stage-establish-theft',
    purpose: 'Establish that the display holds a substituted replica rather than a missing mount.',
    requiredEvidenceIds: [
      'evidence-photo-empty-plinth',
      'evidence-photo-replica-macro',
      'evidence-doc-chain-custody',
    ],
    unlocks: [
      'deduction-replica-source',
      'site-prism-props',
      'scene-restoration-lab',
    ],
  },
  {
    id: 'stage-break-video-alibi',
    purpose: 'Prove that apparent continuity in Gallery Four is manufactured.',
    requiredEvidenceIds: [
      'evidence-cctv-gallery',
      'evidence-doc-camera-hash',
    ],
    unlocks: ['deduction-camera-replay'],
  },
  {
    id: 'stage-clear-conservator',
    purpose: 'Separate the recorded credential from the person it was assigned to.',
    requiredEvidenceIds: [
      'evidence-email-badge-alert',
      'evidence-doc-admin-audit',
      'evidence-doc-restoration-log',
    ],
    unlocks: ['deduction-cloned-credential'],
  },
  {
    id: 'stage-open-service-route',
    purpose: 'Use the replay finding to search the physical route behind the gallery.',
    availableWhen: {
      kind: 'deductionSolved',
      deductionId: 'deduction-camera-replay',
    },
    requiredEvidenceIds: [
      'evidence-cctv-east-corridor',
      'evidence-photo-navy-fiber',
      'evidence-photo-toolmarks',
    ],
    unlocks: ['deduction-service-route'],
  },
  {
    id: 'stage-trace-replica',
    purpose: 'Tie the substitute stone to an advance commission and controlled pickup.',
    requiredEvidenceIds: [
      'evidence-photo-replica-macro',
      'evidence-receipt-prism-replica',
      'evidence-email-replica-order',
    ],
    unlocks: ['deduction-replica-source'],
  },
  {
    id: 'stage-expose-broker',
    purpose: 'Connect the executor to the planned buyer without relying on motive alone.',
    availableWhen: {
      kind: 'deductionSolved',
      deductionId: 'deduction-service-route',
    },
    requiredEvidenceIds: [
      'evidence-message-adrian-elias',
      'evidence-email-elias-consignment',
      'evidence-receipt-transfer',
    ],
    unlocks: ['deduction-ward-connection'],
  },
  {
    id: 'stage-exclude-broker-as-executor',
    purpose:
      'Resolve the strongest alternative theory: the broker had an unmonitored interval, so his location must be settled by record rather than assumption.',
    requiredEvidenceIds: [
      'evidence-cctv-auction-lounge',
      'evidence-doc-lounge-call-record',
    ],
    unlocks: ['exclusion-elias-ward-executor'],
  },
  {
    id: 'stage-prove-motive',
    purpose:
      'Establish the executor’s concealed personal debt and eliminate the insurance and trust motives that the red herrings suggest.',
    availableWhen: {
      kind: 'deductionSolved',
      deductionId: 'deduction-service-route',
    },
    requiredEvidenceIds: [
      'evidence-doc-cross-debt',
      'evidence-message-adrian-elias',
      'evidence-email-insurance-rider',
      'evidence-web-vane-finances',
    ],
    unlocks: ['deduction-executor-motive'],
  },
  {
    id: 'stage-find-cache',
    purpose: 'Identify the temporary cache before the evidence can leave the museum.',
    availableWhen: {
      kind: 'all',
      conditions: [
        { kind: 'deductionSolved', deductionId: 'deduction-service-route' },
        { kind: 'deductionSolved', deductionId: 'deduction-ward-connection' },
      ],
    },
    requiredEvidenceIds: [
      'evidence-photo-keyring',
      'evidence-doc-radio-inventory',
      'evidence-receipt-locker-service',
    ],
    unlocks: ['deduction-diamond-cache', 'scene-loading-lockers'],
  },
  {
    id: 'stage-final-accusation',
    purpose:
      'Require method, false credential, route, replica source, broker, cache, and motive to agree before a commitment is accepted.',
    availableWhen: {
      kind: 'all',
      conditions: [
        { kind: 'deductionSolved', deductionId: 'deduction-camera-replay' },
        { kind: 'deductionSolved', deductionId: 'deduction-cloned-credential' },
        { kind: 'deductionSolved', deductionId: 'deduction-replica-source' },
        { kind: 'deductionSolved', deductionId: 'deduction-service-route' },
        { kind: 'deductionSolved', deductionId: 'deduction-ward-connection' },
        { kind: 'deductionSolved', deductionId: 'deduction-diamond-cache' },
        { kind: 'deductionSolved', deductionId: 'deduction-executor-motive' },
      ],
    },
    requiredEvidenceIds: [
      'evidence-photo-recovered-asterion',
      'evidence-cctv-east-corridor',
      'evidence-message-adrian-elias',
      'evidence-doc-admin-audit',
      'evidence-doc-cross-debt',
      'evidence-doc-lounge-call-record',
    ],
    unlocks: ['final-accusation'],
  },
] as const satisfies readonly Case001DependencyStage[];
