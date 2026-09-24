import type {
  EvidenceBoardPlacement,
  EvidenceBoardPlayerState,
  EvidenceBoardViewport,
} from '../domain/evidence-board';
import type { EvidenceId } from '../domain/evidence';

export const EVIDENCE_BOARD_WIDTH = 1800;
export const EVIDENCE_BOARD_HEIGHT = 1400;
export const EVIDENCE_BOARD_ITEM_WIDTH = 196;
export const EVIDENCE_BOARD_ITEM_HEIGHT = 156;
export const EVIDENCE_BOARD_MIN_SCALE = 0.45;
export const EVIDENCE_BOARD_MAX_SCALE = 2.2;

export function createEmptyEvidenceBoardState(): EvidenceBoardPlayerState {
  return {
    placements: {},
    viewport: { x: 24, y: 24, scale: 0.82 },
    groups: [],
    theoryClusters: [],
  };
}

export function createDefaultEvidenceBoardPlacement(
  evidenceId: EvidenceId,
  evidenceIndex: number,
): EvidenceBoardPlacement {
  const column = evidenceIndex % 7;
  const row = Math.floor(evidenceIndex / 7);
  return {
    evidenceId,
    x: 68 + column * 242 + (row % 2) * 12,
    y: 90 + row * 188 + (column % 2) * 8,
    rotation: stableRotation(evidenceId),
    zIndex: evidenceIndex + 1,
  };
}

export function normalizeEvidenceBoardPlacement(
  placement: Pick<EvidenceBoardPlacement, 'evidenceId' | 'x' | 'y' | 'rotation' | 'zIndex'>,
): EvidenceBoardPlacement {
  return {
    evidenceId: placement.evidenceId,
    x: clamp(placement.x, 24, EVIDENCE_BOARD_WIDTH - EVIDENCE_BOARD_ITEM_WIDTH - 24),
    y: clamp(placement.y, 28, EVIDENCE_BOARD_HEIGHT - EVIDENCE_BOARD_ITEM_HEIGHT - 28),
    rotation: clamp(placement.rotation, -8, 8),
    zIndex: Math.max(1, Math.round(placement.zIndex)),
  };
}

export function normalizeEvidenceBoardViewport(
  viewport: EvidenceBoardViewport,
): EvidenceBoardViewport {
  return {
    x: clamp(viewport.x, -EVIDENCE_BOARD_WIDTH * 2, EVIDENCE_BOARD_WIDTH),
    y: clamp(viewport.y, -EVIDENCE_BOARD_HEIGHT * 2, EVIDENCE_BOARD_HEIGHT),
    scale: clamp(
      viewport.scale,
      EVIDENCE_BOARD_MIN_SCALE,
      EVIDENCE_BOARD_MAX_SCALE,
    ),
  };
}

export function isFiniteEvidenceBoardTransform(
  values: readonly number[],
) {
  return values.every(Number.isFinite);
}

function stableRotation(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return ((Math.abs(hash) % 61) - 30) / 10;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
