import { useEffect } from 'react';

import { playCue } from '@/core/audio/audioEngine';
import { useAppStore } from '@/state/app.store';
import { setCaseTransitionListener } from '@/state/case-session.store';

import { useFeedbackSignals } from './feedbackSignals';
import {
  completionFeedback,
  connectionFeedback,
  confirmationFeedback,
  contradictionFeedback,
  discoveryFeedback,
  placementFeedback,
  selectionFeedback,
} from './haptics';
import {
  describeTransition,
  type FeedbackEvent,
} from './transitionFeedback';

function playHaptic(event: FeedbackEvent, hapticsEnabled: boolean) {
  switch (event.haptic) {
    case 'selection':
      return selectionFeedback(hapticsEnabled);
    case 'placement':
      return placementFeedback(hapticsEnabled);
    case 'discovery':
      return discoveryFeedback(hapticsEnabled);
    case 'connection':
      return connectionFeedback(hapticsEnabled);
    case 'contradiction':
      return contradictionFeedback(hapticsEnabled);
    case 'confirmation':
      return confirmationFeedback(hapticsEnabled);
    case 'completion':
      return completionFeedback(hapticsEnabled);
    case 'none':
    default:
      return undefined;
  }
}

/**
 * Bridges deterministic engine transitions to restrained player feedback:
 * one haptic, and at most one short banner, per meaningful state change.
 * The case logic never learns that this exists.
 */
export function useFeedbackBridge() {
  useEffect(
    () =>
      setCaseTransitionListener((definition, previous, next, action) => {
        const event = describeTransition(definition, previous, next, action);
        if (!event) return;

        playHaptic(event, useAppStore.getState().settings.hapticsEnabled);

        // One cue per transition, matched to the haptic. The engine decides
        // whether it is audible, affordable, and off cooldown.
        if (event.sound) {
          playCue(event.sound, {
            priority:
              event.haptic === 'selection' || event.haptic === 'placement'
                ? 'incidental'
                : 'significant',
          });
        }

        if (event.title) {
          useFeedbackSignals.getState().show({
            kind: event.kind,
            title: event.title,
            detail: event.detail,
          });
        }
      }),
    [],
  );
}
