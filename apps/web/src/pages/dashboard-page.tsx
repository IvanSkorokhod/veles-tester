import { useEffect, useState } from "react";
import type { BrowserSessionProbeResult } from "@veles/shared";

import { loadDashboardSystemStatus, type DashboardSystemStatusSnapshot } from "../modules/system/system-status.client.js";
import { MetricCard, PageLayout, PlaceholderStatusList, type PlaceholderStatusItem, TablePlaceholder } from "./page-primitives.js";

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

export function DashboardPage() {
  const [systemStatusSnapshot, setSystemStatusSnapshot] = useState<DashboardSystemStatusSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const snapshot = await loadDashboardSystemStatus();

        if (!isMounted) {
          return;
        }

        setSystemStatusSnapshot(snapshot);
        setLoadError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Unable to load system status.");
        setSystemStatusSnapshot(null);
      }
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const systemStatusModel = buildSystemStatusModel(systemStatusSnapshot, loadError);

  return (
    <PageLayout
      title="Dashboard"
      description="Operational overview for the MVP execution slice. The dashboard can stay open in any browser while Veles automation uses a dedicated attached Chromium-based browser session."
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
          items={systemStatusModel.items}
          label={systemStatusModel.label}
          footer={systemStatusModel.footer}
        />
      </div>
    </PageLayout>
  );
}

function buildSystemStatusModel(
  snapshot: DashboardSystemStatusSnapshot | null,
  loadError: string | null
): {
  items: PlaceholderStatusItem[];
  label: string;
  footer: string;
} {
  if (loadError !== null) {
    const checkedAt = new Date().toISOString();

    return {
      label: "Load Error",
      footer: `Last checked: ${formatCheckedAt(checkedAt)}`,
      items: [
        {
          label: "API Reachability",
          value: "Unavailable",
          helper: `The dashboard could not load system status from the backend. ${loadError}`,
          tone: "danger"
        },
        {
          label: "Worker Availability",
          value: "Placeholder",
          helper: "Still using placeholder development data in this MVP step.",
          tone: "warning"
        },
        {
          label: "Browser Session",
          value: "Unavailable",
          helper: "Live attached browser-session data could not be loaded because the backend probe endpoint was unreachable.",
          tone: "danger"
        }
      ]
    };
  }

  if (snapshot === null) {
    return {
      label: "Checking",
      footer: "Last checked: pending initial probe",
      items: [
        {
          label: "API Reachability",
          value: "Checking",
          helper: "Loading API health information from the backend.",
          tone: "default"
        },
        {
          label: "Worker Availability",
          value: "Placeholder",
          helper: "Still using placeholder development data in this MVP step.",
          tone: "warning"
        },
        {
          label: "Browser Session",
          value: "Checking",
          helper:
            "Running a read-only probe against the attached automation browser session. Microsoft Edge is recommended for local automation; the dashboard can remain open in any browser.",
          tone: "default"
        }
      ]
    };
  }

  const apiStatusItem: PlaceholderStatusItem =
    snapshot.apiHealth === undefined
      ? {
          label: "API Reachability",
          value: "Unavailable",
          helper: "The API health response could not be loaded even though the dashboard rendered.",
          tone: "danger"
        }
      : {
          label: "API Reachability",
          value: "Reachable",
          helper: `Backend health endpoint responded with status ${snapshot.apiHealth.status}.`,
          tone: "success"
        };

  return {
    label: "Live Probe",
    footer: `Last checked: ${formatCheckedAt(snapshot.checkedAt)}`,
    items: [
      apiStatusItem,
      {
        label: "Worker Availability",
        value: "Placeholder",
        helper: "Still using placeholder development data until a worker health endpoint is added.",
        tone: "warning"
      },
      mapBrowserSessionStatusItem(snapshot.browserSession)
    ]
  };
}

function mapBrowserSessionStatusItem(browserSession?: BrowserSessionProbeResult): PlaceholderStatusItem {
  if (browserSession === undefined) {
    return {
      label: "Browser Session",
      value: "Unavailable",
      helper: "The attached browser-session probe response could not be loaded from the backend.",
      tone: "danger"
    };
  }

  switch (browserSession.state) {
    case "CDP_UNAVAILABLE":
      return {
        label: "Browser Session",
        value: "CDP Unavailable",
        helper: browserSession.message,
        tone: "danger"
      };
    case "BROWSER_CONNECTED":
      return {
        label: "Browser Session",
        value: "Browser Connected",
        helper: `${browserSession.message} Contexts: ${browserSession.contextCount}. Pages: ${browserSession.pageCount}.`,
        tone: "default"
      };
    case "VELES_TAB_NOT_FOUND":
      return {
        label: "Browser Session",
        value: "No Veles Tab",
        helper: `${browserSession.message} Contexts: ${browserSession.contextCount}. Pages: ${browserSession.pageCount}.`,
        tone: "warning"
      };
    case "VELES_TAB_FOUND":
      return {
        label: "Browser Session",
        value: "Veles Tab Found",
        helper: buildBrowserSessionHelper(browserSession),
        tone: "warning"
      };
    case "VELES_TAB_ACCESSIBLE":
      return {
        label: "Browser Session",
        value: "Veles Tab Accessible",
        helper: buildBrowserSessionHelper(browserSession),
        tone: "success"
      };
    default:
      return exhaustiveGuard(browserSession.state);
  }
}

function buildBrowserSessionHelper(browserSession: BrowserSessionProbeResult): string {
  const parts = [browserSession.message];

  if (browserSession.velesTabTitle) {
    parts.push(`Title: ${browserSession.velesTabTitle}.`);
  }

  if (browserSession.velesTabUrl) {
    parts.push(`URL: ${browserSession.velesTabUrl}`);
  }

  return parts.join(" ");
}

function formatCheckedAt(checkedAt: string): string {
  const date = new Date(checkedAt);

  return Number.isNaN(date.valueOf()) ? checkedAt : date.toLocaleString();
}

function exhaustiveGuard(value: never): never {
  throw new Error(`Unhandled browser session state: ${String(value)}`);
}
