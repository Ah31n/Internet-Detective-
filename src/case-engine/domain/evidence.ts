export type EvidenceId = string;

export interface EvidenceMediaReference {
  /** Stable key resolved by the native evidence-media registry. */
  assetId: string;
  /** Optional remote source for downloadable case packs. */
  uri?: string;
  altText: string;
  width: number;
  height: number;
}

export interface EvidenceBase {
  id: EvidenceId;
  title: string;
  source: string;
  summary: string;
  capturedAtLabel?: string;
  tags?: readonly string[];
}

export interface PhotoAnnotation {
  id: string;
  xPercent: number;
  yPercent: number;
  label: string;
}

export interface PhotoEvidenceDefinition extends EvidenceBase {
  type: 'photo';
  image: EvidenceMediaReference;
  caption: string;
  annotations: readonly PhotoAnnotation[];
}

export type EvidenceTextBlock =
  | { id: string; kind: 'heading'; text: string }
  | { id: string; kind: 'paragraph'; text: string }
  | { id: string; kind: 'quote'; text: string }
  | { id: string; kind: 'redaction'; characterCount: number };

export interface DocumentPageDefinition {
  id: string;
  label: string;
  blocks: readonly EvidenceTextBlock[];
}

export interface DocumentEvidenceDefinition extends EvidenceBase {
  type: 'document';
  documentType: string;
  author: string;
  pages: readonly DocumentPageDefinition[];
}

export interface ReceiptLineDefinition {
  id: string;
  description: string;
  quantity: number;
  amountLabel: string;
}

export interface ReceiptEvidenceDefinition extends EvidenceBase {
  type: 'receipt';
  merchant: string;
  addressLines: readonly string[];
  issuedAtLabel: string;
  lines: readonly ReceiptLineDefinition[];
  subtotalLabel: string;
  taxLabel?: string;
  totalLabel: string;
  paymentLabel?: string;
  referenceLabel?: string;
}

export interface MessageParticipantDefinition {
  id: string;
  displayName: string;
  handle?: string;
  isDeviceOwner?: boolean;
}

export interface MessageEntryDefinition {
  id: string;
  senderId: string;
  sentAtLabel: string;
  body: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageEvidenceDefinition extends EvidenceBase {
  type: 'message';
  platform: string;
  conversationTitle: string;
  participants: readonly MessageParticipantDefinition[];
  messages: readonly MessageEntryDefinition[];
}

export interface EmailAddressDefinition {
  name?: string;
  address: string;
}

export interface EmailEvidenceDefinition extends EvidenceBase {
  type: 'email';
  from: EmailAddressDefinition;
  to: readonly EmailAddressDefinition[];
  cc?: readonly EmailAddressDefinition[];
  sentAtLabel: string;
  subject: string;
  body: readonly EvidenceTextBlock[];
  attachmentEvidenceIds: readonly EvidenceId[];
}

export interface CCTVMarkerDefinition {
  id: string;
  offsetSeconds: number;
  label: string;
}

export interface CCTVEvidenceDefinition extends EvidenceBase {
  type: 'cctv';
  cameraLabel: string;
  recordedAtLabel: string;
  durationSeconds: number;
  video: EvidenceMediaReference;
  poster?: EvidenceMediaReference;
  markers: readonly CCTVMarkerDefinition[];
  transcript?: readonly EvidenceTextBlock[];
}

export interface WebpageEvidenceDefinition extends EvidenceBase {
  type: 'webpage';
  siteName: string;
  displayUrl: string;
  headline: string;
  byline?: string;
  publishedAtLabel?: string;
  heroImage?: EvidenceMediaReference;
  body: readonly EvidenceTextBlock[];
  capturedAtLabel: string;
}

export interface StatementEvidenceDefinition extends EvidenceBase {
  type: 'statement';
  speakerName: string;
  speakerRole?: string;
  recordedAtLabel: string;
  locationLabel?: string;
  paragraphs: readonly EvidenceTextBlock[];
  signedBy?: string;
}

export type EvidenceDefinition =
  | PhotoEvidenceDefinition
  | DocumentEvidenceDefinition
  | ReceiptEvidenceDefinition
  | MessageEvidenceDefinition
  | EmailEvidenceDefinition
  | CCTVEvidenceDefinition
  | WebpageEvidenceDefinition
  | StatementEvidenceDefinition;

export type EvidenceType = EvidenceDefinition['type'];

export type EvidenceConnectionKind =
  | 'related'
  | 'supports'
  | 'contradicts'
  | 'sequence';

export interface EvidenceConnection {
  /** Stable, engine-derived ID based on endpoints and relation. */
  id: string;
  fromEvidenceId: EvidenceId;
  toEvidenceId: EvidenceId;
  kind: EvidenceConnectionKind;
  createdOnTurn: number;
}
