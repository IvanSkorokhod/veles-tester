import { PageLayout, SectionCard, TablePlaceholder } from "./page-primitives.js";

export function SettingsPage() {
  return (
    <PageLayout
      title="Settings"
      description="Environment-level controls and connectivity surfaces for local operator use during the MVP stage."
    >
      <SectionCard
        title="Environment Overview"
        description="This page is ready for future controls around API base URL, local health checks, and browser-session diagnostics."
      >
        <TablePlaceholder
          title="Settings surface"
          description="Configurable operator settings and health wiring will be introduced here in later iterations."
          columns={[
            { key: "setting", label: "Setting" },
            { key: "scope", label: "Scope" },
            { key: "current-value", label: "Current Value" },
            { key: "status", label: "Status" }
          ]}
        />
      </SectionCard>
    </PageLayout>
  );
}
