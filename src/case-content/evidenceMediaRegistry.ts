import type { ImageSource } from 'expo-image';
import type { VideoSource } from 'expo-video';

import type { EvidenceMediaReference } from '@/case-engine';

/**
 * Native require(...) values are registered by stable asset ID. Keeping this
 * outside CaseDefinition leaves authored case data serializable.
 *
 * PHASE 16 — every image ships in two resolutions.
 *
 * `display` (long edge 1280) is what full-screen inspection reads from.
 * `thumb` (long edge 420) is what the evidence board, the evidence index, and
 * the closing montage read from. The distinction is not cosmetic: a 1536 px
 * master decodes to a 6.3 MB bitmap, so eleven cards on the wall cost roughly
 * 69 MB of pixel buffers to draw artwork at about 150 pt. The thumbnail
 * decodes to about 0.5 MB and is indistinguishable at that size.
 *
 * A `require` is only an asset id, not a decode — nothing here loads until an
 * `<Image>` with that source is actually mounted, so a case's artwork is never
 * resident all at once.
 */

export type EvidenceImageVariant = 'display' | 'thumb';

interface EvidenceImageAsset {
  display: number;
  thumb: number;
}

const EVIDENCE_MEDIA_ASSETS: Readonly<Record<string, EvidenceImageAsset>> = {
  'case001-photo-empty-plinth': {
    display: require('../../assets/cases/case001/photo-empty-plinth.jpg'),
    thumb: require('../../assets/cases/case001/photo-empty-plinth.thumb.jpg'),
  },
  'case001-photo-replica-macro': {
    display: require('../../assets/cases/case001/photo-replica-macro.jpg'),
    thumb: require('../../assets/cases/case001/photo-replica-macro.thumb.jpg'),
  },
  'case001-photo-toolmarks': {
    display: require('../../assets/cases/case001/photo-toolmarks.jpg'),
    thumb: require('../../assets/cases/case001/photo-toolmarks.thumb.jpg'),
  },
  'case001-photo-navy-fiber': {
    display: require('../../assets/cases/case001/photo-navy-fiber.jpg'),
    thumb: require('../../assets/cases/case001/photo-navy-fiber.thumb.jpg'),
  },
  'case001-photo-gala-wide': {
    display: require('../../assets/cases/case001/photo-gala-wide.jpg'),
    thumb: require('../../assets/cases/case001/photo-gala-wide.thumb.jpg'),
  },
  'case001-photo-keyring': {
    display: require('../../assets/cases/case001/photo-keyring.jpg'),
    thumb: require('../../assets/cases/case001/photo-keyring.thumb.jpg'),
  },
  'case001-photo-recovered-asterion': {
    display: require('../../assets/cases/case001/photo-recovered-asterion.jpg'),
    thumb: require('../../assets/cases/case001/photo-recovered-asterion.thumb.jpg'),
  },
  'case001-cctv-gallery-poster': {
    display: require('../../assets/cases/case001/cctv-gallery-poster.jpg'),
    thumb: require('../../assets/cases/case001/cctv-gallery-poster.thumb.jpg'),
  },
  'case001-cctv-corridor-poster': {
    display: require('../../assets/cases/case001/cctv-corridor-poster.jpg'),
    thumb: require('../../assets/cases/case001/cctv-corridor-poster.thumb.jpg'),
  },
  'case001-cctv-terrace-poster': {
    display: require('../../assets/cases/case001/cctv-terrace-poster.jpg'),
    thumb: require('../../assets/cases/case001/cctv-terrace-poster.thumb.jpg'),
  },
  'case001-cctv-auction-poster': {
    display: require('../../assets/cases/case001/cctv-auction-poster.jpg'),
    thumb: require('../../assets/cases/case001/cctv-auction-poster.thumb.jpg'),
  },
};

/** Asset ids registered in this build, for the media budget test. */
export const EVIDENCE_MEDIA_ASSET_IDS: readonly string[] =
  Object.keys(EVIDENCE_MEDIA_ASSETS);

export function resolveEvidenceImage(
  media: EvidenceMediaReference,
  variant: EvidenceImageVariant = 'display',
): ImageSource | number | null {
  if (media.uri) return { uri: media.uri };
  return EVIDENCE_MEDIA_ASSETS[media.assetId]?.[variant] ?? null;
}

/**
 * No MP4 is bundled in this build: Case 001's CCTV records are authored as
 * poster stills plus deterministic markers and transcripts. Returning null
 * here is what keeps the viewer from creating a native video player it would
 * never use. When clips do ship, register them in their own asset map
 * alongside the images — and keep them out of the image map, so a decoder is
 * still only created for a record that actually has footage.
 */
export function resolveEvidenceVideo(
  media: EvidenceMediaReference,
): VideoSource | null {
  return media.uri ? { uri: media.uri } : null;
}
