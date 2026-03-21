import { useEffect, useState } from "react";
import { exhaustiveGuard, type RunStatus } from "@veles/shared";

import { loadRunsOverview, type RunListEntry, type RunsOverview } from "../modules/runs/runs.client.js";
import { MetricCard, PageLayout, SectionCard } from "./page-primitives.js";

export function RunsPage() {
  const [overview, setOverview] = useState<RunsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const nextOverview = await loadRunsOverview();

        if (!isMounted) {
          return;
        }

        setOverview(nextOverview);
        setError(null);
        setLoading(false);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load runs overview.");
        setOverview(null);
        setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = overview?.summary.summary;
  const runs = overview?.runs ?? [];
  const isLoading = loading && overview === null && error === null;

  return (
    <PageLayout
      title="Runs"
      description="Execution records and donor-adapted aggregation metrics for persisted MVP runs. This view ports the donor Backtests summary idea into the current API-backed architecture."
    >
      <section className="metrics-grid" aria-label="Run summary metrics">
        <MetricCard
          label="Total Runs"
          value={summary ? String(summary.totalRuns) : "—"}
          helper="All persisted run records across the current MVP slice."
        />
        <MetricCard
          label="Success Rate"
          value={formatPercent(summary?.successRatePercent)}
          tone={resolveSuccessTone(summary?.successRatePercent)}
          helper="Computed over terminal runs only: succeeded, failed, and cancelled."
        />
        <MetricCard
          label="Cumulative Net Profit"
          value={formatNumber(summary?.cumulativeNetProfit)}
          tone={resolveProfitTone(summary?.cumulativeNetProfit)}
          helper="Cumulative net profit across successful runs with parsed metrics."
        />
        <MetricCard
          label="Max Cumulative Drawdown"
          value={formatNumber(summary?.maxCumulativeDrawdown)}
          tone="danger"
          helper="Donor-adapted rollup metric calculated from the cumulative net profit series."
        />
      </section>

      <div className="content-grid">
        <SectionCard
          title="Run Summary"
          description="Pure aggregation logic adapted from the donor backtest statistics flow, rewritten around persisted experiment runs and parsed result metrics."
        >
          {error ? (
            <p className="inline-message inline-message--danger">{error}</p>
          ) : summary ? (
            <dl className="summary-grid">
              <SummaryItem label="Successful Runs" value={String(summary.successfulRuns)} />
              <SummaryItem label="Failed Runs" value={String(summary.failedRuns)} />
              <SummaryItem label="Queued Runs" value={String(summary.queuedRuns)} />
              <SummaryItem label="Active Runs" value={String(summary.runningRuns)} />
              <SummaryItem label="Average Net Profit" value={formatNumber(summary.averageNetProfit)} />
              <SummaryItem label="Median Net Profit" value={formatNumber(summary.medianNetProfit)} />
              <SummaryItem label="Best Run" value={formatNumber(summary.bestNetProfit)} />
              <SummaryItem label="Worst Run" value={formatNumber(summary.worstNetProfit)} />
              <SummaryItem label="Average Trades" value={formatNumber(summary.averageTradeCount)} />
              <SummaryItem label="Average Max Drawdown" value={formatNumber(summary.averageMaxDrawdown)} />
            </dl>
          ) : (
            <p className="inline-message">Loading run analytics from the backend.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Aggregation Notes"
          description="This first donor-derived slice keeps analytics in shared code and leaves extension-only transport assumptions out of the current system."
        >
          <div className="summary-grid">
            <SummaryItem label="Generated At" value={formatTimestamp(overview?.summary.generatedAt)} />
            <SummaryItem
              label="Profit Points"
              value={overview ? String(overview.summary.cumulativeNetProfitSeries.length) : "—"}
            />
            <SummaryItem label="Runs In Table" value={String(runs.length)} />
            <SummaryItem label="Data Source" value="API + Prisma persisted runs" />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Run History"
        description="The latest persisted runs, with parsed result metrics and experiment linkage."
      >
        <div className="table-card">
          <div className="table-card__header">
            <h3>Runs</h3>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Experiment</th>
                  <th>Status</th>
                  <th>Net Profit</th>
                  <th>Trades</th>
                  <th>Max Drawdown</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="data-table__empty" colSpan={7}>
                      <span>Loading runs…</span>
                    </td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td className="data-table__empty" colSpan={7}>
                      <strong>No runs yet.</strong>
                      <span>Persisted experiment runs will appear here after the first execution completes.</span>
                    </td>
                  </tr>
                ) : (
                  runs.map((entry) => <RunTableRow entry={entry} key={entry.run.id} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </PageLayout>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-grid__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RunTableRow({ entry }: { entry: RunListEntry }) {
  return (
    <tr>
      <td>
        <code>{shortId(entry.run.id)}</code>
      </td>
      <td>
        <div className="table-primary">
          <strong>{entry.experiment.name}</strong>
          <span>{shortId(entry.experiment.id)}</span>
        </div>
      </td>
      <td>
        <span className={`status-chip ${statusToneClassName(entry.run.status)}`}>{formatStatus(entry.run.status)}</span>
      </td>
      <td className={numericToneClassName(entry.result?.netProfit ?? null)}>{formatNumber(entry.result?.netProfit)}</td>
      <td>{formatInteger(entry.result?.tradeCount)}</td>
      <td>{formatNumber(entry.result?.maxDrawdown)}</td>
      <td>{formatTimestamp(entry.run.finishedAt ?? entry.run.startedAt)}</td>
    </tr>
  );
}

function formatStatus(status: RunStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInteger(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${formatNumber(value)}%`;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function statusToneClassName(status: RunStatus): string {
  switch (status) {
    case "succeeded":
      return "status-chip--success";
    case "failed":
    case "cancelled":
      return "status-chip--danger";
    case "running":
      return "status-chip--warning";
    case "pending":
    case "queued":
      return "status-chip--default";
    default:
      return exhaustiveGuard(status);
  }
}

function resolveProfitTone(value: number | null | undefined): "default" | "success" | "danger" {
  if (typeof value !== "number" || Number.isNaN(value) || value === 0) {
    return "default";
  }

  return value > 0 ? "success" : "danger";
}

function resolveSuccessTone(value: number | null | undefined): "default" | "success" | "danger" {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "default";
  }

  if (value >= 60) {
    return "success";
  }

  if (value > 0) {
    return "danger";
  }

  return "default";
}

function numericToneClassName(value: number | null): string | undefined {
  if (typeof value !== "number" || Number.isNaN(value) || value === 0) {
    return undefined;
  }

  return value > 0 ? "table-number--positive" : "table-number--negative";
}

