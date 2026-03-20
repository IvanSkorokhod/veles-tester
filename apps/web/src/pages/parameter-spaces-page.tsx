import { PageLayout, SectionCard, TablePlaceholder } from "./page-primitives.js";

export function ParameterSpacesPage() {
  return (
    <PageLayout
      title="Parameter Spaces"
      description="Execution-ready input ranges and fixed-value sets derived from a reviewed strategy template."
    >
      <SectionCard
        title="Parameter Space Library"
        description="Each parameter space will later show the owning template, schema summary, and validation status."
      >
        <TablePlaceholder
          title="Parameter spaces"
          description="Parameter spaces created for the fixed backtest schema will appear here once they are persisted."
          columns={[
            { key: "name", label: "Name" },
            { key: "template", label: "Template" },
            { key: "parameter-count", label: "Parameters" },
            { key: "status", label: "Status" },
            { key: "updated", label: "Updated" }
          ]}
        />
      </SectionCard>
    </PageLayout>
  );
}
