import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import {
  type RestorableRoute,
  useAppStore,
} from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

/**
 * Persists the last meaningful game destination for cold-launch restoration,
 * and records the last screen opened inside the active case.
 */
export function useRememberRoute(route: RestorableRoute) {
  const rememberRoute = useAppStore((state) => state.rememberRoute);

  useFocusEffect(
    useCallback(() => {
      rememberRoute(route);

      const { activeCaseId, setLastScreen } = useCaseSessionStore.getState();
      if (activeCaseId) setLastScreen(activeCaseId, route);
    }, [rememberRoute, route]),
  );
}
