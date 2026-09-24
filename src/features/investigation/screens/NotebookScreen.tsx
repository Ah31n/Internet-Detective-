import { InvestigationSectionScreen } from './InvestigationSectionScreen';

export function NotebookScreen() {
  return (
    <InvestigationSectionScreen
      code="FIELD NOTEBOOK"
      icon="create-outline"
      message="Observations and player-authored notes will remain attached to the active investigation."
      route="/investigation/notebook"
      section="Notebook"
      title="Notebook unopened"
    />
  );
}
