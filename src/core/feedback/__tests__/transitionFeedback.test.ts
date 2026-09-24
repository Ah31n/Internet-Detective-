import { describe, expect, it } from 'vitest';

import {
  createInitialCasePlayerState,
  transitionCase,
  type CaseAction,
  type CasePlayerState,
} from '@/case-engine';
import { CASE_001 } from '@/case-content/cases/case001/case001.definition';

import { describeTransition } from '../transitionFeedback';

/**
 * PHASE 11 — the feedback layer is a pure function of two engine states.
 * These tests pin down that it stays restrained: one event per transition,
 * nothing at all for the many transitions that do not deserve a buzz.
 */

function apply(state: CasePlayerState, action: CaseAction): CasePlayerState {
  const result = transitionCase(CASE_001, state, action);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function feedbackFor(state: CasePlayerState, action: CaseAction) {
  const next = apply(state, action);
  return {
    next,
    event: describeTransition(CASE_001, state, next, action),
  };
}

function investigating(): CasePlayerState {
  let state = createInitialCasePlayerState(CASE_001);
  state = apply(state, { type: 'BEGIN_INVESTIGATION' });
  return state;
}

describe('phase 11 · restrained transition feedback', () => {
  it('announces recovered evidence once, with a medium impact', () => {
    const { event } = feedbackFor(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });

    expect(event).toMatchObject({ kind: 'discovery', haptic: 'discovery' });
    expect(event?.title).toBe('EVIDENCE RECOVERED');
  });

  it('separates a pinned string from a marked contradiction', () => {
    let state = apply(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });

    const supported = feedbackFor(state, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-doc-camera-hash',
      toEvidenceId: 'evidence-cctv-gallery',
      kind: 'supports',
    });
    expect(supported.event).toMatchObject({
      kind: 'connection',
      haptic: 'connection',
      title: 'STRING PINNED',
    });

    state = supported.next;
    const contradiction = feedbackFor(state, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-doc-camera-hash',
      toEvidenceId: 'evidence-doc-admin-audit',
      kind: 'contradicts',
    });
    expect(contradiction.event).toMatchObject({
      kind: 'contradiction',
      haptic: 'contradiction',
    });
  });

  it('confirms a proven deduction and a pinned timeline event', () => {
    const state = apply(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });

    const deduction = feedbackFor(state, {
      type: 'SUBMIT_DEDUCTION',
      deductionId: 'deduction-camera-replay',
      evidenceIds: ['evidence-cctv-gallery', 'evidence-doc-camera-hash'],
    });
    expect(deduction.event).toMatchObject({
      kind: 'deduction',
      haptic: 'confirmation',
    });

    const timeline = feedbackFor(state, {
      type: 'SET_TIMELINE_EVENT_PINNED',
      timelineEventId: 'timeline-2052-credential-clone',
      pinned: true,
    });
    expect(timeline.event).toMatchObject({
      kind: 'timeline',
      haptic: 'confirmation',
    });
  });

  it('keeps board placement and message opening silent on screen', () => {
    const state = apply(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });

    const placement = feedbackFor(state, {
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId: 'evidence-doc-camera-hash',
      x: 420,
      y: 380,
      rotation: 1,
    });
    // Haptic only: a banner for every drag would be noise.
    expect(placement.event).toMatchObject({ kind: 'placement', title: null });

    const hint = feedbackFor(state, {
      type: 'USE_HINT',
      deductionId: 'deduction-camera-replay',
    });
    expect(hint.event).toMatchObject({ kind: 'hint', haptic: 'selection' });
  });

  it('plays the two-beat completion pattern only when the case resolves', () => {
    const state = investigating();
    expect(describeTransition(CASE_001, state, state, { type: 'BEGIN_INVESTIGATION' })).toBeNull();

    const resolved: CasePlayerState = {
      ...state,
      resolution: { correct: true, score: 97, resolvedOnTurn: state.turn },
    };
    const event = describeTransition(CASE_001, state, resolved, {
      type: 'SUBMIT_ACCUSATION',
      answers: {},
    });
    expect(event).toMatchObject({ kind: 'completion', haptic: 'completion' });
    expect(event?.detail).toContain('97');
  });

  it('returns nothing when a transition changes nothing worth feeling', () => {
    const state = investigating();
    const next = apply(state, {
      type: 'SET_EVIDENCE_BOARD_VIEWPORT',
      x: 12,
      y: 12,
      scale: 1,
    });
    expect(describeTransition(CASE_001, state, next, {
      type: 'SET_EVIDENCE_BOARD_VIEWPORT',
      x: 12,
      y: 12,
      scale: 1,
    })).toBeNull();
  });
});

describe('phase 13 · one cue per transition', () => {
  it('gives recovered evidence the document cue', () => {
    const { event } = feedbackFor(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });
    expect(event?.sound).toBe('ui-document-open');
  });

  it('separates a pinned string from a marked contradiction in sound too', () => {
    const state = apply(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });

    const supported = feedbackFor(state, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-doc-camera-hash',
      toEvidenceId: 'evidence-cctv-gallery',
      kind: 'supports',
    });
    expect(supported.event?.sound).toBe('ui-tap');

    const contradiction = feedbackFor(supported.next, {
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: 'evidence-doc-camera-hash',
      toEvidenceId: 'evidence-doc-admin-audit',
      kind: 'contradicts',
    });
    // Dark and short. Never a fanfare for being right.
    expect(contradiction.event?.sound).toBe('investigation-contradiction');
  });

  it('confirms deductions and timeline events with the same restrained cue', () => {
    const state = apply(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });

    expect(
      feedbackFor(state, {
        type: 'SUBMIT_DEDUCTION',
        deductionId: 'deduction-camera-replay',
        evidenceIds: ['evidence-cctv-gallery', 'evidence-doc-camera-hash'],
      }).event?.sound,
    ).toBe('investigation-timeline-confirm');

    expect(
      feedbackFor(state, {
        type: 'SET_TIMELINE_EVENT_PINNED',
        timelineEventId: 'timeline-2052-credential-clone',
        pinned: true,
      }).event?.sound,
    ).toBe('investigation-timeline-confirm');
  });

  it('plays the completion cue only when the case is closed', () => {
    const state = investigating();
    const resolved: CasePlayerState = {
      ...state,
      resolution: { correct: true, score: 97, resolvedOnTurn: state.turn },
    };
    const event = describeTransition(CASE_001, state, resolved, {
      type: 'SUBMIT_ACCUSATION',
      answers: {},
    });
    expect(event?.sound).toBe('completion-case-closed');
  });

  it('keeps board placement quiet but physical', () => {
    const state = apply(investigating(), {
      type: 'VISIT_SCENE',
      sceneId: 'scene-security-annex',
    });
    const placement = feedbackFor(state, {
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId: 'evidence-doc-camera-hash',
      x: 420,
      y: 380,
      rotation: 1,
    });
    expect(placement.event).toMatchObject({
      sound: 'ui-evidence-place',
      title: null,
    });
  });
});
