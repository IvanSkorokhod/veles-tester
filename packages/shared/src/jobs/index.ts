import type { ParameterValue } from "../domain/index.js";

export const QUEUE_NAMES = {
  experimentPlanning: "experiment-planning",
  backtestExecution: "backtest-execution",
  resultPostprocessing: "result-postprocessing"
} as const;

export const JOB_NAMES = {
  experimentCreate: "experiment.create",
  experimentExpand: "experiment.expand",
  runExecute: "run.execute",
  runRetry: "run.retry",
  resultParse: "result.parse",
  rankingRecalculate: "ranking.recalculate"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export interface ExperimentCreateJobPayload {
  experimentId: string;
}

export interface ExperimentExpandJobPayload {
  experimentId: string;
  stageNumber: number;
}

export interface RunExecuteJobPayload {
  experimentId: string;
  runId: string;
  stageNumber: number;
  strategyTemplateId: string;
  strategyTemplateVersion: string;
  parameterValues: Record<string, ParameterValue>;
}

export interface RunRetryJobPayload {
  runId: string;
  attemptNumber: number;
  reason: string;
}

export interface ResultParseJobPayload {
  runId: string;
  experimentId: string;
}

export interface RankingRecalculateJobPayload {
  experimentId: string;
  stageNumber: number;
}

export interface JobPayloadMap {
  [JOB_NAMES.experimentCreate]: ExperimentCreateJobPayload;
  [JOB_NAMES.experimentExpand]: ExperimentExpandJobPayload;
  [JOB_NAMES.runExecute]: RunExecuteJobPayload;
  [JOB_NAMES.runRetry]: RunRetryJobPayload;
  [JOB_NAMES.resultParse]: ResultParseJobPayload;
  [JOB_NAMES.rankingRecalculate]: RankingRecalculateJobPayload;
}
