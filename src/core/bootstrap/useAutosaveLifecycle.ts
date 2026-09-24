import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { flushAutosave } from '@/state/persistence/autosaveStorage';
import { useCaseSessionStore } from '@/state/case-session.store';
import { startProgressionBridge } from '@/state/playerState';

/** Longest gap between duration checkpoints while the game is in the foreground. */
const HEARTBEAT_MS = 30_000;

/**
 * Keeps persisted progress safe across backgrounding, foregrounding, and
 * termination, and accumulates investigation duration for the active case.
 *
 * Frequent interactions (board drags, viewport changes) are coalesced by the
 * autosave transport; lifecycle transitions force an immediate write.
 */
export function useAutosaveLifecycle() {
  const activeSinceRef = useRef<number | null>(null);

  useEffect(() => {
    activeSinceRef.current = Date.now();
    const unsubscribeProgression = startProgressionBridge();

    const commitElapsed = () => {
      const startedAt = activeSinceRef.current;
      activeSinceRef.current = null;
      if (startedAt === null) return;

      const { activeCaseId, accumulatePlayTime } = useCaseSessionStore.getState();
      const elapsed = Date.now() - startedAt;
      if (activeCaseId && elapsed > 0) accumulatePlayTime(activeCaseId, elapsed);
    };

    const heartbeat = setInterval(() => {
      if (activeSinceRef.current === null) return;
      commitElapsed();
      activeSinceRef.current = Date.now();
      void flushAutosave();
    }, HEARTBEAT_MS);

    const handleAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') {
        if (activeSinceRef.current === null) activeSinceRef.current = Date.now();
        return;
      }

      // 'inactive' precedes both backgrounding and termination on iOS.
      commitElapsed();
      void flushAutosave();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      clearInterval(heartbeat);
      commitElapsed();
      void flushAutosave();
      unsubscribeProgression();
    };
  }, []);
}
