import type { EvidenceDefinition, EvidenceId } from '@/case-engine';

import { CCTVEvidenceViewer } from './CCTVEvidenceViewer';
import { DocumentEvidenceViewer } from './DocumentEvidenceViewer';
import { EmailEvidenceViewer } from './EmailEvidenceViewer';
import { MessageEvidenceViewer } from './MessageEvidenceViewer';
import { PhotoEvidenceViewer } from './PhotoEvidenceViewer';
import { ReceiptEvidenceViewer } from './ReceiptEvidenceViewer';
import { StatementEvidenceViewer } from './StatementEvidenceViewer';
import { WebpageEvidenceViewer } from './WebpageEvidenceViewer';

export function EvidenceViewer({
  evidence,
  hapticsEnabled,
  onOpenEvidence,
}: {
  evidence: EvidenceDefinition;
  hapticsEnabled: boolean;
  onOpenEvidence: (evidenceId: EvidenceId) => void;
}) {
  switch (evidence.type) {
    case 'photo':
      return (
        <PhotoEvidenceViewer evidence={evidence} hapticsEnabled={hapticsEnabled} />
      );
    case 'document':
      return (
        <DocumentEvidenceViewer
          evidence={evidence}
          hapticsEnabled={hapticsEnabled}
        />
      );
    case 'receipt':
      return <ReceiptEvidenceViewer evidence={evidence} />;
    case 'message':
      return <MessageEvidenceViewer evidence={evidence} />;
    case 'email':
      return (
        <EmailEvidenceViewer
          evidence={evidence}
          hapticsEnabled={hapticsEnabled}
          onOpenEvidence={onOpenEvidence}
        />
      );
    case 'cctv':
      return (
        <CCTVEvidenceViewer evidence={evidence} hapticsEnabled={hapticsEnabled} />
      );
    case 'webpage':
      return <WebpageEvidenceViewer evidence={evidence} />;
    case 'statement':
      return <StatementEvidenceViewer evidence={evidence} />;
  }
}
