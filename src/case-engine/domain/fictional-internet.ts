import type { CaseCondition } from './case-definition';
import type { EvidenceId } from './evidence';

export type FictionalSiteId = string;
export type FictionalPageId = string;

export type FictionalSiteLayout =
  | 'newsroom'
  | 'community'
  | 'market'
  | 'institutional'
  | 'personal'
  | 'broadcast';

export interface FictionalSiteIdentity {
  /** Must be unique within a case, so two sites cannot silently share a skin. */
  identityId: string;
  name: string;
  shortName: string;
  fictionalHost: `${string}.invalid`;
  tagline: string;
  layout: FictionalSiteLayout;
  logoText: string;
  typography: 'editorial' | 'technical' | 'friendly' | 'tabloid' | 'minimal';
  shape: 'square' | 'soft' | 'pill';
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentSecondary: string;
  };
}

export interface LocalInternetImageReference {
  /** Native, bundled asset key. Fictional sites never use a remote URI. */
  assetId: string;
  altText: string;
  aspectRatio: number;
}

export type FictionalPageBlock =
  | { id: string; type: 'heading'; text: string; level: 1 | 2 | 3 }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'quote'; text: string; attribution?: string }
  | { id: string; type: 'notice'; label: string; text: string; tone: 'info' | 'warning' | 'urgent' }
  | { id: string; type: 'image'; image: LocalInternetImageReference; caption?: string }
  | { id: string; type: 'metric'; label: string; value: string; detail?: string }
  | { id: string; type: 'list'; items: readonly string[]; ordered?: boolean }
  | {
      id: string;
      type: 'post';
      author: string;
      handle?: string;
      timestampLabel: string;
      body: string;
      reactionLabel?: string;
    }
  | {
      id: string;
      type: 'profile';
      name: string;
      role?: string;
      bio: string;
      image?: LocalInternetImageReference;
      facts?: readonly { label: string; value: string }[];
    }
  | {
      id: string;
      type: 'product';
      name: string;
      priceLabel: string;
      description: string;
      statusLabel?: string;
      image?: LocalInternetImageReference;
    };

export interface FictionalPageLink {
  id: string;
  label: string;
  targetSiteId: FictionalSiteId;
  targetPageId: FictionalPageId;
  treatment?: 'primary' | 'secondary' | 'inline';
}

export interface FictionalPageDefinition {
  id: FictionalPageId;
  path: `/${string}`;
  title: string;
  description: string;
  publishedAtLabel?: string;
  blocks: readonly FictionalPageBlock[];
  links: readonly FictionalPageLink[];
  revealsEvidenceIds: readonly EvidenceId[];
  searchTerms: readonly string[];
}

export interface FictionalSiteDefinition {
  id: FictionalSiteId;
  identity: FictionalSiteIdentity;
  homePageId: FictionalPageId;
  openWhen?: CaseCondition;
  pages: readonly FictionalPageDefinition[];
}

export interface FictionalInternetDefinition {
  sites: readonly FictionalSiteDefinition[];
}

export interface FictionalInternetLocation {
  siteId: FictionalSiteId;
  pageId: FictionalPageId;
}

export interface FictionalInternetPlayerState {
  currentLocation: FictionalInternetLocation | null;
  history: readonly FictionalInternetLocation[];
  historyIndex: number;
  visitedPageKeys: readonly string[];
  bookmarkedPageKeys: readonly string[];
}

export interface FictionalInternetSearchResult {
  key: string;
  siteId: FictionalSiteId;
  pageId: FictionalPageId;
  siteName: string;
  fictionalHost: string;
  title: string;
  description: string;
}
