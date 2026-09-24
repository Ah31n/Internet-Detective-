import { InvestigationSectionScreen } from './InvestigationSectionScreen';

export function EvidenceScreen() {
  return (
    <InvestigationSectionScreen
      code="EVIDENCE INTAKE"
      icon="layers-outline"
      message="Recovered media, documents, and digital artifacts will be handled on this surface."
      route="/investigation/evidence"
      section="Evidence"
      title="No evidence indexed"
    />
  );
}
