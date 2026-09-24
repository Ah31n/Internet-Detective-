import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';
import { useEntitlementStore } from '@/state/entitlement.store';
import { usePlayerProfileStore } from '@/state/player-profile.store';

import { useFeedbackBridge } from '@/core/feedback/useFeedbackBridge';

import { useAutosaveLifecycle } from './useAutosaveLifecycle';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Waits for persisted shell state and icon fonts before route content renders. */
export function useAppBootstrap() {
  const appStateHydrated = useAppStore((state) => state.hasHydrated);
  const caseSessionsHydrated = useCaseSessionStore((state) => state.hasHydrated);
  const profileHydrated = usePlayerProfileStore((state) => state.hasHydrated);
  // Entitlements gate what the library will even offer to open, so the app
  // waits for them rather than briefly showing a case as unavailable.
  const entitlementsHydrated = useEntitlementStore((state) => state.hasHydrated);
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const isReady =
    appStateHydrated &&
    caseSessionsHydrated &&
    profileHydrated &&
    entitlementsHydrated &&
    (fontsLoaded || Boolean(fontError));

  useAutosaveLifecycle();
  useFeedbackBridge();

  useEffect(() => {
    if (isReady) SplashScreen.hide();
  }, [isReady]);

  return isReady;
}
