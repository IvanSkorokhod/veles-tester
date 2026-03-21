import type { NormalizedBacktestMetrics } from "../results/index.js";
import type { ArtifactType, ExperimentStatus, JobState, ParameterValue, RunStatus, TimestampedEntity } from "./common.js";

export interface ParameterSpace extends TimestampedEntity {
  id: string;
  strategyTemplateId: string;
  name: string;
  values: Record<string, ParameterValue | ParameterValue[] | { min: number; max: number; step?: number }>;
  searchPolicy: Record<string, unknown>;
  validationSummary?: Record<string, unknown>;
}

export interface ExperimentStage {
  stageNumber: number;
  status: JobState;
  selectionStrategy: string;
}

export interface Experiment extends TimestampedEntity {
  id: string;
  name: string;
  strategyTemplateId: string;
  parameterSpaceId: string;
  status: ExperimentStatus;
  stageCount: number;
  objectiveConfig: Record<string, unknown>;
  rankingProfile: Record<string, unknown>;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  stageNumber: number;
  parameterHash: string;
  parameterValues: Record<string, ParameterValue>;
  status: RunStatus;
  attemptCount: number;
  failureCode?: string;
  workerId?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RunArtifact {
  id: string;
  experimentRunId: string;
  artifactType: ArtifactType;
  storageRef: string;
  mimeType: string;
  stepName?: string;
  capturedAt: string;
}

export interface BacktestResult {
  id: string;
  experimentRunId: string;
  success: boolean;
  rawPayload: Record<string, unknown>;
  normalizedMetrics: NormalizedBacktestMetrics;
  netProfit: number | null;
  tradeCount: number | null;
  maxDrawdown: number | null;
  parserVersion: string;
  parsedAt: string;
}

export interface RankingSnapshot extends TimestampedEntity {
  id: string;
  experimentId: string;
  stageNumber: number;
  scoringConfig: Record<string, unknown>;
  filters?: Record<string, unknown>;
  rankedRunIds: string[];
  scoreBreakdown: Record<string, Record<string, number>>;
}
