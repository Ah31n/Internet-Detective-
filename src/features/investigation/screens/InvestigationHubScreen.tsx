import { InvestigationSectionScreen } from './InvestigationSectionScreen';

export function InvestigationHubScreen() {
  return (
    <InvestigationSectionScreen
      code="ROOM READY"
      icon="scan-outline"
      message="Open a case file to activate the investigation workspace and its connected tools."
      route="/investigation"
      section="Hub"
      title="Awaiting an investigation"
    />
  );
}
