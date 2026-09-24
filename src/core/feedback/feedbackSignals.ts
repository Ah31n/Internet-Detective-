import { create } from 'zustand';

import type { FeedbackKind } from './transitionFeedback';

export interface FeedbackBanner {
  readonly id: number;
  readonly kind: FeedbackKind;
  readonly title: string;
  readonly detail: string | null;
}

interface FeedbackSignalStore {
  banner: FeedbackBanner | null;
  /** Only one banner is ever on screen: a newer signal replaces an older one. */
  show: (banner: Omit<FeedbackBanner, 'id'>) => void;
  dismiss: (id?: number) => void;
}

let nextId = 1;

export const useFeedbackSignals = create<FeedbackSignalStore>()((set) => ({
  banner: null,
  show: (banner) => set({ banner: { ...banner, id: nextId++ } }),
  dismiss: (id) =>
    set((state) =>
      id === undefined || state.banner?.id === id ? { banner: null } : state,
    ),
}));
