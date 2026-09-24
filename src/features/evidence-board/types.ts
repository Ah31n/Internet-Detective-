import type { EvidenceId } from '@/case-engine';

export interface LiveBoardPlacement {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

/**
 * The live position of every card, shared with the UI thread.
 *
 * Mutable by design: it is updated in place with `SharedValue.modify` during a
 * drag rather than rebuilt, so a sixty-per-second gesture does not allocate a
 * forty-eight-key object on every frame. Read it, never reassign it.
 */
export type LiveBoardPlacements = Record<EvidenceId, LiveBoardPlacement>;

export type BoardInteractionMode =
  | { kind: 'connect' | 'contradict'; sourceId: EvidenceId }
  | { kind: 'group' | 'theory'; selectedIds: readonly EvidenceId[] };
