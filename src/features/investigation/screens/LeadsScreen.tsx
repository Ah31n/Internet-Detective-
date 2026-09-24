import { InvestigationSectionScreen } from './InvestigationSectionScreen';

export function LeadsScreen() {
  return (
    <InvestigationSectionScreen
      code="LEAD NETWORK"
      icon="git-network-outline"
      message="People, handles, locations, and unresolved connections will converge here."
      route="/investigation/leads"
      section="Leads"
      title="No leads connected"
    />
  );
}
