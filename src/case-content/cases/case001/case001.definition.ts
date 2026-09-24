import type { CaseDefinition } from '../../../case-engine';

import { CASE001_EVIDENCE } from './case001.evidence';
import {
  CASE001_LOCATIONS,
  CASE001_RELATIONSHIPS,
  CASE001_SUSPECTS,
  CASE001_TIMELINE,
} from './case001.intelligence';
import { CASE001_INTERNET } from './case001.internet';
import { CASE001_CANONICAL_TRUTH } from './case001.truth';

export const CASE_001 = {
  schemaVersion: 1,
  id: 'case-001-missing-diamond',
  contentVersion: 1,
  metadata: {
    title: 'CASE 001 — THE MISSING DIAMOND',
    subtitle: 'The Asterion vanished in a room full of witnesses',
    classification: 'MAJOR ART THEFT / ACTIVE',
    estimatedMinutes: 110,
    difficulty: 'field',
    tags: ['art-theft', 'museum', 'digital-forensics', 'closed-circle'],
  },
  brief: {
    classification: 'RESTRICTED / HARTWELL TASKING',
    summary:
      'At 21:25, during Hartwell Museum’s Midnight Gallery gala, the director discovered that the forty-two-carat Asterion Diamond had been replaced by a near-perfect replica. The public display seal is intact. Six people had motive, access, or both. Reconstruct the twenty-minute window, test every alibi, recover the stone, and identify anyone who enabled its sale.',
    objectives: [
      { id: 'objective-establish-substitution', text: 'Establish how the sealed display was defeated.' },
      { id: 'objective-test-alibis', text: 'Test all six suspect alibis against independent timestamps.' },
      { id: 'objective-follow-replica', text: 'Trace the replica’s commission and route into the museum.' },
      { id: 'objective-recover-asterion', text: 'Locate the authentic Asterion before it leaves Hartwell.' },
      { id: 'objective-identify-conspiracy', text: 'Identify the thief and any person who arranged the sale.' },
    ],
  },
  investigation: {
    startingSceneId: 'scene-asterion-gallery',
    startingEvidenceIds: [],
    suspects: CASE001_SUSPECTS,
    locations: CASE001_LOCATIONS,
    relationships: CASE001_RELATIONSHIPS,
    timeline: CASE001_TIMELINE,
    scenes: [
      {
        id: 'scene-asterion-gallery',
        kind: 'location',
        locationId: 'location-asterion-gallery',
        title: 'Asterion Gallery',
        summary: 'The sealed display contains a replica. Begin with the physical scene and custody baseline.',
        revealsEvidenceIds: [
          'evidence-photo-empty-plinth',
          'evidence-photo-replica-macro',
          'evidence-doc-chain-custody',
          'evidence-doc-plinth-sop',
          'evidence-statement-celeste',
        ],
      },
      {
        id: 'scene-grand-rotunda',
        kind: 'location',
        locationId: 'location-grand-rotunda',
        title: 'Grand Rotunda',
        summary: 'Donor photographs, event operations, and the museum board’s private concerns intersect here.',
        revealsEvidenceIds: [
          'evidence-photo-gala-wide',
          'evidence-message-celeste-board',
          'evidence-message-gala-staff',
          'evidence-email-insurance-rider',
          'evidence-email-power-test',
        ],
      },
      {
        id: 'scene-security-annex',
        kind: 'location',
        locationId: 'location-security-annex',
        title: 'East Security Annex',
        summary: 'Examine the camera mirror, credential terminal, duty roster, and command key issue.',
        revealsEvidenceIds: [
          'evidence-photo-keyring',
          'evidence-doc-camera-hash',
          'evidence-doc-admin-audit',
          'evidence-email-security-roster',
          'evidence-email-badge-alert',
          'evidence-cctv-gallery',
          'evidence-statement-adrian',
        ],
      },
      {
        id: 'scene-restoration-lab',
        kind: 'location',
        locationId: 'location-restoration-lab',
        title: 'Restoration Laboratory',
        summary: 'Bell’s secret contact and instrument record must be separated from the credential bearing her name.',
        openWhen: { kind: 'evidenceViewed', evidenceId: 'evidence-photo-replica-macro' },
        revealsEvidenceIds: [
          'evidence-doc-restoration-log',
          'evidence-message-mara-nia',
          'evidence-email-restoration-report',
          'evidence-statement-mara',
        ],
      },
      {
        id: 'scene-auction-lounge',
        kind: 'location',
        locationId: 'location-auction-lounge',
        title: 'Auction Lounge',
        summary: 'Ward’s hospitality alibi has a camera gap, a private niche, and an undisclosed transaction trail.',
        revealsEvidenceIds: [
          'evidence-receipt-auction-wine',
          'evidence-doc-lounge-call-record',
          'evidence-receipt-transfer',
          'evidence-email-elias-consignment',
          'evidence-cctv-auction-lounge',
          'evidence-statement-elias',
        ],
      },
      {
        id: 'scene-roof-terrace',
        kind: 'location',
        locationId: 'location-roof-terrace',
        title: 'Roof Terrace',
        summary: 'Rook’s financial pressure is real. Determine whether the timeline gives him the opportunity to act.',
        revealsEvidenceIds: [
          'evidence-receipt-julian-restaurant',
          'evidence-message-julian-creditor',
          'evidence-cctv-roof-terrace',
          'evidence-statement-julian',
        ],
      },
      {
        id: 'scene-press-alcove',
        kind: 'location',
        locationId: 'location-press-alcove',
        title: 'Press Alcove',
        summary: 'Okafor recorded without permission, but her local archive can test both her alibi and Bell’s.',
        revealsEvidenceIds: [
          'evidence-statement-nia',
        ],
      },
      {
        id: 'scene-east-corridor',
        kind: 'location',
        locationId: 'location-east-corridor',
        title: 'East Service Corridor',
        summary: 'Once the gallery replay is established, the ignored local camera and rear access route become searchable.',
        openWhen: { kind: 'deductionSolved', deductionId: 'deduction-camera-replay' },
        revealsEvidenceIds: [
          'evidence-cctv-east-corridor',
          'evidence-photo-navy-fiber',
          'evidence-photo-toolmarks',
        ],
      },
      {
        id: 'scene-forensics-bench',
        kind: 'location',
        locationId: 'location-forensics-bench',
        title: 'Device Forensics Bench',
        summary:
          'A proven physical route supports seizure orders. Imaged handsets and locker contents can now be examined.',
        openWhen: { kind: 'deductionSolved', deductionId: 'deduction-service-route' },
        revealsEvidenceIds: [
          'evidence-message-adrian-elias',
          'evidence-doc-cross-debt',
        ],
      },
      {
        id: 'scene-loading-lockers',
        kind: 'location',
        locationId: 'location-loading-lockers',
        title: 'Loading Dock Locker Bay',
        summary: 'The proven service route and broker contact narrow the emergency search to equipment staged for pickup.',
        openWhen: {
          kind: 'all',
          conditions: [
            { kind: 'deductionSolved', deductionId: 'deduction-service-route' },
            { kind: 'deductionSolved', deductionId: 'deduction-ward-connection' },
          ],
        },
        revealsEvidenceIds: [
          'evidence-doc-radio-inventory',
          'evidence-receipt-locker-service',
          'evidence-photo-recovered-asterion',
        ],
      },
    ],
    evidence: CASE001_EVIDENCE,
    internet: CASE001_INTERNET,
    deductions: [
      {
        id: 'deduction-camera-replay',
        prompt: 'Which records prove that Gallery Four’s apparently continuous camera image cannot be trusted?',
        openWhen: { kind: 'evidenceDiscovered', evidenceId: 'evidence-doc-camera-hash' },
        minimumEvidence: 2,
        maximumEvidence: 2,
        hint:
          'Compare what the recorder claims with what the forensic frame analysis measured. Two records are enough.',
      },
      {
        id: 'deduction-cloned-credential',
        prompt: 'Which records prove the east-panel credential was a clone and do not place its named owner at the panel?',
        openWhen: { kind: 'evidenceDiscovered', evidenceId: 'evidence-doc-restoration-log' },
        minimumEvidence: 3,
        maximumEvidence: 3,
        hint:
          'A credential is not a person. Pair the access records with an independent instrument log for the named owner.',
      },
      {
        id: 'deduction-replica-source',
        prompt: 'Which three artifacts trace the substitute stone to a specific advance commission?',
        openWhen: { kind: 'evidenceDiscovered', evidenceId: 'evidence-receipt-prism-replica' },
        minimumEvidence: 3,
        maximumEvidence: 3,
        hint:
          'Start from the mark on the stone itself, then follow it to a workshop order and the correspondence that released it.',
      },
      {
        id: 'deduction-service-route',
        prompt: 'Which physical and camera evidence identifies the route and equipment used behind Gallery Four?',
        openWhen: { kind: 'evidenceDiscovered', evidenceId: 'evidence-cctv-east-corridor' },
        minimumEvidence: 3,
        maximumEvidence: 3,
        hint:
          'Behind the gallery, look for one camera the central recorder ignored and the two physical traces left on the way through.',
      },
      {
        id: 'deduction-ward-connection',
        prompt: 'Which records establish an undisclosed plan and payment between the executor and a broker?',
        openWhen: {
          kind: 'all',
          conditions: [
            { kind: 'evidenceDiscovered', evidenceId: 'evidence-message-adrian-elias' },
            { kind: 'evidenceDiscovered', evidenceId: 'evidence-receipt-transfer' },
          ],
        },
        minimumEvidence: 3,
        maximumEvidence: 3,
        hint:
          'A private channel alone proves contact. Add the buyer approach and the settlement that moved afterwards.',
      },
      {
        id: 'deduction-diamond-cache',
        prompt: 'Which three records identify the temporary cache used before the loading-dock handoff?',
        openWhen: { kind: 'evidenceDiscovered', evidenceId: 'evidence-doc-radio-inventory' },
        minimumEvidence: 3,
        maximumEvidence: 3,
        hint:
          'Ask what equipment was staged for pickup that morning, who requested the move, and who was photographed holding its tag.',
      },
      {
        id: 'deduction-executor-motive',
        prompt:
          'Which four records establish the executor’s personal financial motive and eliminate the museum and the family trust as the driver?',
        openWhen: { kind: 'evidenceDiscovered', evidenceId: 'evidence-doc-cross-debt' },
        minimumEvidence: 4,
        maximumEvidence: 4,
        hint:
          'Weigh the executor’s personal obligation against the two published motives that the records actually rule out.',
      },
    ],
    accusation: {
      title: 'The Asterion Conspiracy',
      prompt: 'Commit to one explanation that accounts for the access, substitution, route, payment, and recovery.',
      openWhen: {
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
      questions: [
        {
          id: 'question-thief',
          prompt: 'Who physically exchanged the Asterion for the replica?',
          options: [
            { id: 'answer-celeste-vane', label: 'Dr. Celeste Vane' },
            { id: 'answer-adrian-cross', label: 'Adrian Cross' },
            { id: 'answer-mara-bell', label: 'Mara Bell' },
            { id: 'answer-julian-rook', label: 'Julian Rook' },
            { id: 'answer-nia-okafor', label: 'Nia Okafor' },
            { id: 'answer-elias-ward-thief', label: 'Elias Ward' },
          ],
        },
        {
          id: 'question-accomplice',
          prompt: 'Who arranged the illicit buyer and funded the replica?',
          options: [
            { id: 'answer-no-accomplice', label: 'No accomplice' },
            { id: 'answer-celeste-accomplice', label: 'Dr. Celeste Vane' },
            { id: 'answer-elias-ward', label: 'Elias Ward' },
            { id: 'answer-mara-accomplice', label: 'Mara Bell' },
            { id: 'answer-julian-accomplice', label: 'Julian Rook' },
            { id: 'answer-nia-accomplice', label: 'Nia Okafor' },
          ],
        },
        {
          id: 'question-method',
          prompt: 'How was the intact public seal bypassed?',
          options: [
            { id: 'answer-glass-lift', label: 'The glass hood was lifted and resealed' },
            { id: 'answer-replay-service-hatch', label: 'A camera replay concealed entry through the rear service hatch' },
            { id: 'answer-curator-switch', label: 'The stone was exchanged before the gala condition check' },
            { id: 'answer-remote-plinth', label: 'The plinth released the stone through a remote mechanism' },
          ],
        },
        {
          id: 'question-hiding-place',
          prompt: 'Where was the authentic diamond held for pickup?',
          options: [
            { id: 'answer-press-case', label: 'Inside a press equipment case' },
            { id: 'answer-terrace-drain', label: 'Beneath the Roof Terrace drain cover' },
            { id: 'answer-radio-r17', label: 'Inside retired emergency radio R-17' },
            { id: 'answer-auction-cellar', label: 'Inside an Auction Lounge wine crate' },
          ],
        },
        {
          id: 'question-motive',
          prompt: 'What drove the executor to accept the plan?',
          options: [
            { id: 'answer-insurance-fraud', label: 'Museum insurance fraud' },
            { id: 'answer-family-trust', label: 'Release of the Rook family trust' },
            { id: 'answer-private-debt', label: 'Payment of a concealed private debt' },
            { id: 'answer-climate-protest', label: 'Protest over unsafe display conditions' },
          ],
        },
      ],
    },
  },
  canonicalTruth: CASE001_CANONICAL_TRUTH,
  scoring: {
    maximumScore: 100,
    incorrectDeductionPenalty: 4,
    incorrectAccusationPenalty: 10,
    hintPenalty: 3,
  },
} as const satisfies CaseDefinition;
