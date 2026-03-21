import type {
  BacktestResult,
  Experiment,
  ExperimentRun,
  RunAnalyticsSnapshot,
  RunArtifact
} from "@veles/shared";

import { fetchJson } from "../../infrastructure/api.js";

export interface RunListEntry {
  run: ExperimentRun;
  experiment: Pick<Experiment, "id" | "name" | "status">;
  result: BacktestResult | null;
  artifacts: RunArtifact[];
}

export interface RunsOverview {
  summary: RunAnalyticsSnapshot;
  runs: RunListEntry[];
}

export async function loadRunsOverview(): Promise<RunsOverview> {
  const [summary, runs] = await Promise.all([
    fetchJson<RunAnalyticsSnapshot>("/api/runs/summary"),
    fetchJson<RunListEntry[]>("/api/runs")
  ]);

  return {
    summary,
    runs
  };
}
