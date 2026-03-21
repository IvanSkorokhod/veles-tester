import type { RunStatus } from "../domain/common.js";

export interface RunAnalyticsInput {
  runId: string;
  status: RunStatus;
  occurredAt: string;
  netProfit: number | null;
  tradeCount: number | null;
  maxDrawdown: number | null;
}

export interface RunProfitPoint {
  runId: string;
  occurredAt: string;
  netProfit: number;
  cumulativeNetProfit: number;
}

export interface RunAnalyticsSummary {
  totalRuns: number;
  queuedRuns: number;
  runningRuns: number;
  successfulRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  terminalRuns: number;
  successRatePercent: number | null;
  cumulativeNetProfit: number;
  averageNetProfit: number | null;
  medianNetProfit: number | null;
  bestNetProfit: number | null;
  worstNetProfit: number | null;
  averageTradeCount: number | null;
  averageMaxDrawdown: number | null;
  maxCumulativeDrawdown: number;
}

export interface RunAnalyticsSnapshot {
  generatedAt: string;
  summary: RunAnalyticsSummary;
  cumulativeNetProfitSeries: RunProfitPoint[];
}

// Donor-adapted from de-don/veles-tools backtest aggregation concepts.
// This version aggregates persisted experiment runs instead of extension-local backtests and deals.
export function buildRunAnalyticsSnapshot(
  runs: RunAnalyticsInput[],
  generatedAt: string = new Date().toISOString()
): RunAnalyticsSnapshot {
  const statusCounts = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0
  };

  for (const run of runs) {
    switch (run.status) {
      case "pending":
      case "queued":
        statusCounts.queued += 1;
        break;
      case "running":
        statusCounts.running += 1;
        break;
      case "succeeded":
        statusCounts.succeeded += 1;
        break;
      case "failed":
        statusCounts.failed += 1;
        break;
      case "cancelled":
        statusCounts.cancelled += 1;
        break;
      default:
        exhaustiveGuard(run.status);
    }
  }

  const metricRuns = runs.filter((run) => run.status === "succeeded" && typeof run.netProfit === "number");
  const sortedMetricRuns = [...metricRuns].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );

  const netProfits = sortedMetricRuns.map((run) => run.netProfit as number);
  const tradeCounts = sortedMetricRuns.flatMap((run) => (typeof run.tradeCount === "number" ? [run.tradeCount] : []));
  const maxDrawdowns = sortedMetricRuns.flatMap((run) =>
    typeof run.maxDrawdown === "number" ? [run.maxDrawdown] : []
  );

  let cumulativeNetProfit = 0;
  const cumulativeNetProfitSeries = sortedMetricRuns.map((run) => {
    cumulativeNetProfit += run.netProfit as number;

    return {
      runId: run.runId,
      occurredAt: run.occurredAt,
      netProfit: round(run.netProfit as number, 2),
      cumulativeNetProfit: round(cumulativeNetProfit, 2)
    };
  });

  const cumulativeValues = cumulativeNetProfitSeries.map((point) => point.cumulativeNetProfit);
  const terminalRuns = statusCounts.succeeded + statusCounts.failed + statusCounts.cancelled;

  return {
    generatedAt,
    summary: {
      totalRuns: runs.length,
      queuedRuns: statusCounts.queued,
      runningRuns: statusCounts.running,
      successfulRuns: statusCounts.succeeded,
      failedRuns: statusCounts.failed,
      cancelledRuns: statusCounts.cancelled,
      terminalRuns,
      successRatePercent: terminalRuns > 0 ? round((statusCounts.succeeded / terminalRuns) * 100, 1) : null,
      cumulativeNetProfit: round(cumulativeNetProfit, 2),
      averageNetProfit: netProfits.length > 0 ? round(average(netProfits), 2) : null,
      medianNetProfit: netProfits.length > 0 ? round(median(netProfits), 2) : null,
      bestNetProfit: netProfits.length > 0 ? round(Math.max(...netProfits), 2) : null,
      worstNetProfit: netProfits.length > 0 ? round(Math.min(...netProfits), 2) : null,
      averageTradeCount: tradeCounts.length > 0 ? round(average(tradeCounts), 1) : null,
      averageMaxDrawdown: maxDrawdowns.length > 0 ? round(average(maxDrawdowns), 2) : null,
      maxCumulativeDrawdown: round(calculateMaxDrawdown(cumulativeValues), 2)
    },
    cumulativeNetProfitSeries
  };
}

function calculateMaxDrawdown(values: number[]): number {
  const firstValue = values[0];

  if (firstValue === undefined) {
    return 0;
  }

  let peak = firstValue;
  let maxDrawdown = 0;

  for (const value of values) {
    if (value > peak) {
      peak = value;
      continue;
    }

    const drawdown = peak - value;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] as number;
  }

  return ((sortedValues[middleIndex - 1] as number) + (sortedValues[middleIndex] as number)) / 2;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function exhaustiveGuard(value: never): never {
  throw new Error(`Unhandled run status: ${String(value)}`);
}
