import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { autosaveStorage } from './persistence/autosaveStorage';

export type InvestigationRoute =
  | '/investigation'
  | '/investigation/evidence'
  | '/investigation/leads'
  | '/investigation/notebook'
  | '/investigation/internet';

export type RestorableRoute =
  | '/investigation-home'
  | '/case-library'
  | '/case-brief'
  | '/profile'
  | '/anthology'
  | InvestigationRoute;

export const INVESTIGATION_ROUTES: readonly InvestigationRoute[] = [
  '/investigation',
  '/investigation/evidence',
  '/investigation/leads',
  '/investigation/notebook',
  '/investigation/internet',
];

export const RESTORABLE_ROUTES: readonly RestorableRoute[] = [
  '/investigation-home',
  '/case-library',
  '/case-brief',
  '/profile',
  '/anthology',
  ...INVESTIGATION_ROUTES,
];

/**
 * PHASE 16 — cold launch restores a *validated* destination.
 *
 * The launch sequence ends in `router.replace(lastRoute)`. Nothing previously
 * checked that the persisted string was still a route in this build, so a save
 * written by an older version — or a corrupted payload — would land the player
 * on a blank not-found screen with no obvious way back, and it would do it on
 * every launch because the bad value is never overwritten. An unknown route
 * now falls back to the desk.
 */
export function toRestorableRoute(value: unknown): RestorableRoute {
  return typeof value === 'string' &&
    (RESTORABLE_ROUTES as readonly string[]).includes(value)
    ? (value as RestorableRoute)
    : '/investigation-home';
}

export function toInvestigationRoute(value: unknown): InvestigationRoute {
  return typeof value === 'string' &&
    (INVESTIGATION_ROUTES as readonly string[]).includes(value)
    ? (value as InvestigationRoute)
    : '/investigation';
}

/**
 * Audio is mixed in four independent layers so a player can keep the world
 * quiet without losing the interface, or keep the interface silent and leave
 * the room tone running. Volumes are linear 0–1 and the master mute is
 * absolute: when it is on, nothing plays.
 */
export interface AudioSettings {
  masterMuted: boolean;
  musicVolume: number;
  effectsVolume: number;
  ambientVolume: number;
}

/**
 * Text size is a multiplier applied on top of whatever the operating system's
 * own Dynamic Type setting already does, for players who want larger text
 * inside the game without changing their whole device.
 */
export type TextScale = 'standard' | 'large' | 'larger';

export const TEXT_SCALE_MULTIPLIER: Record<TextScale, number> = {
  standard: 1,
  large: 1.15,
  larger: 1.3,
};

export interface AppSettings {
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  /** Raises text, metadata, and evidence identifiers to the highest legibility. */
  highContrast: boolean;
  textScale: TextScale;
  audio: AudioSettings;
}

interface AppState {
  lastRoute: RestorableRoute;
  lastInvestigationRoute: InvestigationRoute;
  settings: AppSettings;
  hasHydrated: boolean;
}

interface AppActions {
  markHydrated: () => void;
  setAudioSetting: <Key extends keyof AudioSettings>(
    key: Key,
    value: AudioSettings[Key],
  ) => void;
  rememberRoute: (route: RestorableRoute) => void;
  setSetting: <Key extends keyof AppSettings>(
    key: Key,
    value: AppSettings[Key],
  ) => void;
  resetShell: () => void;
}

export type AppStore = AppState & AppActions;
type PersistedAppState = Pick<
  AppState,
  'lastRoute' | 'lastInvestigationRoute' | 'settings'
>;

const STORAGE_KEY = 'internet-detective.app-shell';
const STORE_VERSION = 3;

export const defaultAudioSettings: AudioSettings = {
  masterMuted: false,
  // Restrained by default: the game should never be the loudest thing in the
  // room the first time it is opened.
  musicVolume: 0.6,
  effectsVolume: 0.7,
  ambientVolume: 0.45,
};

const defaultSettings: AppSettings = {
  hapticsEnabled: true,
  reduceMotion: false,
  highContrast: false,
  textScale: 'standard',
  audio: defaultAudioSettings,
};

/** Clamps a persisted or user-supplied volume into the mixer's range. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const initialPersistedState: PersistedAppState = {
  lastRoute: '/investigation-home',
  lastInvestigationRoute: '/investigation',
  settings: defaultSettings,
};

export const useAppStore = create<AppStore>()(
  persist<AppStore, [], [], PersistedAppState>(
    (set) => ({
      ...initialPersistedState,
      hasHydrated: false,

      markHydrated: () => set({ hasHydrated: true }),

      rememberRoute: (route) =>
        set((state) => ({
          lastRoute: route,
          lastInvestigationRoute:
            route === '/investigation' || route.startsWith('/investigation/')
              ? (route as InvestigationRoute)
              : state.lastInvestigationRoute,
        })),

      setSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),

      setAudioSetting: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            audio: {
              ...state.settings.audio,
              [key]:
                typeof value === 'number' ? clampVolume(value) : value,
            },
          },
        })),

      resetShell: () => set(initialPersistedState),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => autosaveStorage),
      partialize: ({ lastRoute, lastInvestigationRoute, settings }) => ({
        lastRoute,
        lastInvestigationRoute,
        settings,
      }),
      // `migrate` only runs when the stored version differs, so route
      // validation lives here: `merge` runs on every single rehydration.
      merge: (persisted, current) => {
        const source =
          typeof persisted === 'object' && persisted !== null
            ? (persisted as Partial<PersistedAppState>)
            : {};
        return {
          ...current,
          ...source,
          lastRoute: toRestorableRoute(source.lastRoute),
          lastInvestigationRoute: toInvestigationRoute(
            source.lastInvestigationRoute,
          ),
          settings: { ...current.settings, ...source.settings },
        };
      },
      // v1 shells stored a single `soundEnabled` switch. A player who had
      // turned sound off keeps silence; everyone else gets the default mix.
      migrate: (persisted, version) => {
        const state = persisted as Partial<PersistedAppState> & {
          settings?: Partial<AppSettings> & { soundEnabled?: boolean };
        };
        if (version >= STORE_VERSION) {
          return {
            ...(state as PersistedAppState),
            lastRoute: toRestorableRoute(state?.lastRoute),
            lastInvestigationRoute: toInvestigationRoute(
              state?.lastInvestigationRoute,
            ),
          } satisfies PersistedAppState;
        }
        const legacySoundEnabled = state?.settings?.soundEnabled ?? true;
        return {
          ...initialPersistedState,
          ...state,
          lastRoute: toRestorableRoute(state?.lastRoute),
          lastInvestigationRoute: toInvestigationRoute(
            state?.lastInvestigationRoute,
          ),
          settings: {
            hapticsEnabled: state?.settings?.hapticsEnabled ?? true,
            reduceMotion: state?.settings?.reduceMotion ?? false,
            highContrast: state?.settings?.highContrast ?? false,
            textScale: state?.settings?.textScale ?? 'standard',
            audio: {
              ...defaultAudioSettings,
              ...state?.settings?.audio,
              masterMuted:
                state?.settings?.audio?.masterMuted ?? !legacySoundEnabled,
            },
          },
        } satisfies PersistedAppState;
      },

      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
