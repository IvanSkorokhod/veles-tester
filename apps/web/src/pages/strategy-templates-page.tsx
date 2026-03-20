import { PageLayout, SectionCard, TablePlaceholder } from "./page-primitives.js";

export function StrategyTemplatesPage() {
  return (
    <PageLayout
      title="Strategy Templates"
      description="Reviewed workflow definitions for supported Veles backtest flows and their versioned parameter schemas."
    >
      <SectionCard
        title="Template Registry"
        description="Approved strategy templates will be listed here together with workflow key, version, and execution status."
      >
        <TablePlaceholder
          title="Templates"
          description="Create a strategy template through the API or future UI flow to populate this registry."
          columns={[
            { key: "display-name", label: "Display Name" },
            { key: "workflow-key", label: "Workflow Key" },
            { key: "version", label: "Version" },
            { key: "status", label: "Status" },
            { key: "updated", label: "Updated" }
          ]}
        />
      </SectionCard>
    </PageLayout>
  );
}
