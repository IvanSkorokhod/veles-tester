import { PageLayout, SectionCard, TablePlaceholder } from "./page-primitives.js";

export function ExperimentsPage() {
  return (
    <PageLayout
      title="Experiments"
      description="Experiment definitions that join a strategy template, a parameter space, and queued execution intent."
    >
      <SectionCard
        title="Experiment Queue"
        description="This view is prepared for upcoming API-backed experiment management and run launch flows."
      >
        <TablePlaceholder
          title="Experiments"
          description="Experiments will appear here with current status, linked template, and execution progress."
          columns={[
            { key: "experiment-id", label: "Experiment ID" },
            { key: "template", label: "Template" },
            { key: "parameter-space", label: "Parameter Space" },
            { key: "status", label: "Status" },
            { key: "created", label: "Created" }
          ]}
        />
      </SectionCard>
    </PageLayout>
  );
}
