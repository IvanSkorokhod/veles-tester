import { PageLayout, SectionCard, TablePlaceholder } from "./page-primitives.js";

export function RunsPage() {
  return (
    <PageLayout
      title="Runs"
      description="Execution records, status transitions, parsed metrics, and artifact-ready run history for the MVP flow."
    >
      <SectionCard
        title="Run History"
        description="Recent and historical runs will be listed here once the UI is wired to the run list endpoint."
      >
        <TablePlaceholder
          title="Runs"
          description="Runs will appear here with status, profit metrics, and links to details once data loading is added."
          columns={[
            { key: "run-id", label: "Run ID" },
            { key: "experiment", label: "Experiment" },
            { key: "status", label: "Status" },
            { key: "net-profit", label: "Net Profit" },
            { key: "updated", label: "Updated" }
          ]}
        />
      </SectionCard>
    </PageLayout>
  );
}
