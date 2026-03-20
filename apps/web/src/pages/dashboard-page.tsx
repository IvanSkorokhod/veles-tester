import { MetricCard, PageLayout, PlaceholderStatusList, TablePlaceholder } from "./page-primitives.js";

const metrics = [
  {
    label: "Total Experiments",
    value: "0",
    helper: "No experiments have been created yet."
  },
  {
    label: "Total Runs",
    value: "0",
    helper: "Run execution history will appear here once experiments are launched."
  },
  {
    label: "Successful Runs",
    value: "0",
    helper: "Successful executions will roll up into this summary.",
    tone: "success" as const
  },
  {
    label: "Failed Runs",
    value: "0",
    helper: "Failures will surface here for quick operational review.",
    tone: "danger" as const
  }
];

const systemStatusItems = [
  {
    label: "API Reachability",
    value: "Placeholder",
    helper: "Dev-only shell data until the web app reads live health endpoints.",
    tone: "warning" as const
  },
  {
    label: "Worker Availability",
    value: "Placeholder",
    helper: "Will later reflect BullMQ worker and queue visibility.",
    tone: "warning" as const
  },
  {
    label: "Browser Session",
    value: "Placeholder",
    helper: "Will later reflect attached CDP session status for Veles.",
    tone: "warning" as const
  }
];

export function DashboardPage() {
  return (
    <PageLayout
      title="Dashboard"
      description="Operational overview for the MVP execution slice, with summary counters, recent run visibility, and local system state."
    >
      <section className="metrics-grid" aria-label="Summary metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="content-grid">
        <TablePlaceholder
          title="Recent Runs"
          description="Recent runs will appear here with status, parameter values, and result timestamps."
          columns={[
            { key: "run-id", label: "Run ID" },
            { key: "experiment", label: "Experiment" },
            { key: "status", label: "Status" },
            { key: "result", label: "Result" },
            { key: "updated-at", label: "Updated" }
          ]}
        />

        <PlaceholderStatusList
          title="System Status"
          items={systemStatusItems}
          label="Dev Placeholder"
        />
      </div>
    </PageLayout>
  );
}
