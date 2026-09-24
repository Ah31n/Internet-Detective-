import { useCallback, useRef } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { create } from 'zustand';

/**
 * Volatile navigation context for the investigation surfaces.
 *
 * Persisted progress lives in the case-session store; this holds the smaller,
 * session-only things that make a return trip feel like a return rather than
 * a reset: which evidence a half-built deduction had ticked, which accusation
 * answers were chosen, and how far each list was scrolled. Going
 * Hub → Evidence → E-014 → People → Suspect and back therefore lands the
 * player exactly where they left, with the case untouched.
 */

interface InvestigationContextStore {
  deductionSelections: Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
  >;
  accusationAnswers: Readonly<Record<string, Readonly<Record<string, string>>>>;
  scrollOffsets: Readonly<Record<string, number>>;
  setDeductionSelections: (
    caseId: string,
    value: Readonly<Record<string, readonly string[]>>,
  ) => void;
  setAccusationAnswers: (
    caseId: string,
    value: Readonly<Record<string, string>>,
  ) => void;
  rememberScroll: (key: string, offset: number) => void;
  forgetCase: (caseId: string) => void;
}

export const useInvestigationContext = create<InvestigationContextStore>()(
  (set) => ({
    deductionSelections: {},
    accusationAnswers: {},
    scrollOffsets: {},

    setDeductionSelections: (caseId, value) =>
      set((state) => ({
        deductionSelections: { ...state.deductionSelections, [caseId]: value },
      })),

    setAccusationAnswers: (caseId, value) =>
      set((state) => ({
        accusationAnswers: { ...state.accusationAnswers, [caseId]: value },
      })),

    rememberScroll: (key, offset) =>
      set((state) => ({
        scrollOffsets: { ...state.scrollOffsets, [key]: Math.max(0, offset) },
      })),

    forgetCase: (caseId) =>
      set((state) => {
        const deductionSelections = { ...state.deductionSelections };
        const accusationAnswers = { ...state.accusationAnswers };
        delete deductionSelections[caseId];
        delete accusationAnswers[caseId];
        const scrollOffsets = Object.fromEntries(
          Object.entries(state.scrollOffsets).filter(
            ([key]) => !key.startsWith(`${caseId}:`),
          ),
        );
        return { deductionSelections, accusationAnswers, scrollOffsets };
      }),
  }),
);

/**
 * Restores a list to the offset it had when the player last left it, without
 * animating, so returning from a detail screen never feels like a reload.
 */
export function useRestoredScroll(key: string) {
  const ref = useRef<ScrollView>(null);
  const restored = useRef(false);

  const onContentSizeChange = useCallback(() => {
    if (restored.current) return;
    restored.current = true;
    const offset = useInvestigationContext.getState().scrollOffsets[key] ?? 0;
    if (offset > 0) ref.current?.scrollTo({ y: offset, animated: false });
  }, [key]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      useInvestigationContext
        .getState()
        .rememberScroll(key, event.nativeEvent.contentOffset.y);
    },
    [key],
  );

  return {
    ref,
    onContentSizeChange,
    onScroll,
    scrollEventThrottle: 160,
  } as const;
}
