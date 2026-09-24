import type { EvidenceId } from './evidence';

export type EvidenceBoardGroupId = string;
export type TheoryClusterId = string;

export interface EvidenceBoardPlacement {
  evidenceId: EvidenceId;
  /** World-space coordinates on the case wall, independent of device size. */
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

export interface EvidenceBoardViewport {
  x: number;
  y: number;
  scale: number;
}

export interface EvidenceBoardGroup {
  id: EvidenceBoardGroupId;
  label: string;
  evidenceIds: readonly EvidenceId[];
  createdOnTurn: number;
}

export interface TheoryCluster {
  id: TheoryClusterId;
  title: string;
  evidenceIds: readonly EvidenceId[];
  createdOnTurn: number;
}

/** Serializable, player-authored wall arrangement. */
export interface EvidenceBoardPlayerState {
  placements: Readonly<Record<EvidenceId, EvidenceBoardPlacement>>;
  viewport: EvidenceBoardViewport;
  groups: readonly EvidenceBoardGroup[];
  theoryClusters: readonly TheoryCluster[];
}
