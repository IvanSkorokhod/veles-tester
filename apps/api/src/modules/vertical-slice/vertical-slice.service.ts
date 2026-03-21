import { createHash } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  FIXED_BACKTEST_PARAMETER_DEFINITIONS,
  FIXED_BACKTEST_PARSER_VERSION,
  FIXED_BACKTEST_WORKFLOW_KEY,
  buildRunAnalyticsSnapshot,
  cloneFixedBacktestParameterDefinitions,
  type RunAnalyticsSnapshot,
  type BacktestResult as SharedBacktestResult,
  type Experiment as SharedExperiment,
  type ExperimentRun as SharedExperimentRun,
  type FixedBacktestParameterValues,
  type NormalizedBacktestMetrics,
  type ParameterValue,
  type ParameterSpace as SharedParameterSpace,
  type RunArtifact as SharedRunArtifact,
  type StrategyTemplate as SharedStrategyTemplate
} from "@veles/shared";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import type { ExperimentOrchestratorService } from "../orchestrator/orchestrator.service.js";
import {
  ApiRouteError,
  type CreateExperimentInput,
  type CreateParameterSpaceInput,
  type CreateStrategyTemplateInput,
  type ListRunsQuery,
  validateFixedBacktestValues
} from "./vertical-slice.http.js";

type StrategyTemplateRecord = Prisma.StrategyTemplateGetPayload<Record<string, never>>;

type ParameterSpaceRecord = Prisma.ParameterSpaceGetPayload<Record<string, never>>;
type ExperimentRecord = Prisma.ExperimentGetPayload<Record<string, never>>;
type BacktestResultRecord = Prisma.BacktestResultGetPayload<Record<string, never>>;
type RunArtifactRecord = Prisma.RunArtifactGetPayload<Record<string, never>>;

type RunListRecord = Prisma.ExperimentRunGetPayload<{
  include: {
    backtestResult: true;
    artifacts: true;
    experiment: true;
  };
}>;

type RunDetailsRecord = Prisma.ExperimentRunGetPayload<{
  include: {
    backtestResult: true;
    artifacts: true;
        experiment: {
          include: {
            strategyTemplate: true;
            parameterSpace: true;
          };
        };
  };
}>;

export class VerticalSliceService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly orchestrator: ExperimentOrchestratorService
  ) {}

  public async createStrategyTemplate(input: CreateStrategyTemplateInput): Promise<SharedStrategyTemplate> {
    const parameterDefinitions = cloneFixedBacktestParameterDefinitions();

    try {
      const createdTemplate = await this.prisma.strategyTemplate.create({
        data: {
          templateKey: input.templateKey,
          version: input.version,
          displayName: input.displayName,
          workflowKey: FIXED_BACKTEST_WORKFLOW_KEY,
          status: "ACTIVE",
          parameterSchemaJson: toPrismaJson(parameterDefinitions),
          parserConfigJson: {
            parserVersion: FIXED_BACKTEST_PARSER_VERSION,
            requiredMetrics: ["netProfit", "tradeCount", "maxDrawdown"]
          } as Prisma.InputJsonValue,
          normalizationConfigJson: {
            workflowMode: "fixed-backtest-v1",
            normalizedMetrics: ["netProfit", "tradeCount", "maxDrawdown"]
          } as Prisma.InputJsonValue,
          parameterDefinitions: {
            create: parameterDefinitions.map((definition) => ({
              key: definition.key,
              label: definition.label,
              type: definition.type,
              selector: toPrismaJson(definition.selector),
              allowedValuesJson: definition.allowedValues ? toPrismaJson(definition.allowedValues) : undefined,
              rangeConfigJson: definition.range ? toPrismaJson(definition.range) : undefined,
              dependenciesJson: definition.dependencies ? toPrismaJson(definition.dependencies) : undefined,
              parserHintsJson: definition.parserHints ? toPrismaJson(definition.parserHints) : undefined,
              normalizationHintsJson: definition.normalizationHints ? toPrismaJson(definition.normalizationHints) : undefined
            }))
          }
        }
      });

      return mapStrategyTemplate(createdTemplate);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiRouteError(409, "A strategy template with that templateKey and version already exists.");
      }

      throw error;
    }
  }

  public async createParameterSpace(input: CreateParameterSpaceInput): Promise<SharedParameterSpace> {
    const strategyTemplate = await this.prisma.strategyTemplate.findUnique({
      where: {
        id: input.strategyTemplateId
      }
    });

    if (strategyTemplate === null) {
      throw new ApiRouteError(404, "Strategy template not found.");
    }

    if (strategyTemplate.workflowKey !== FIXED_BACKTEST_WORKFLOW_KEY) {
      throw new ApiRouteError(400, "Only the fixed backtest workflow is supported by the current MVP slice.");
    }

    const values = validateFixedBacktestValues(input.values);

    const createdParameterSpace = await this.prisma.parameterSpace.create({
      data: {
        strategyTemplateId: strategyTemplate.id,
        name: input.name,
        spaceConfigJson: toPrismaJson(values),
        searchPolicyJson: {
          mode: "single-run"
        } as Prisma.InputJsonValue,
        validationSummaryJson: {
          workflowKey: FIXED_BACKTEST_WORKFLOW_KEY,
          validatedKeys: FIXED_BACKTEST_PARAMETER_DEFINITIONS.map((definition) => definition.key)
        } as Prisma.InputJsonValue
      }
    });

    return mapParameterSpace(createdParameterSpace);
  }

  public async createExperiment(
    input: CreateExperimentInput
  ): Promise<{ experiment: SharedExperiment; run: SharedExperimentRun }> {
    const strategyTemplate = await this.prisma.strategyTemplate.findUnique({
      where: {
        id: input.strategyTemplateId
      }
    });

    if (strategyTemplate === null) {
      throw new ApiRouteError(404, "Strategy template not found.");
    }

    if (strategyTemplate.workflowKey !== FIXED_BACKTEST_WORKFLOW_KEY) {
      throw new ApiRouteError(400, "Only the fixed backtest workflow is supported by the current MVP slice.");
    }

    const parameterSpace = await this.prisma.parameterSpace.findUnique({
      where: {
        id: input.parameterSpaceId
      }
    });

    if (parameterSpace === null) {
      throw new ApiRouteError(404, "Parameter space not found.");
    }

    if (parameterSpace.strategyTemplateId !== strategyTemplate.id) {
      throw new ApiRouteError(400, "The selected parameter space does not belong to the selected strategy template.");
    }

    const parameterValues = readStoredFixedBacktestValues(parameterSpace.spaceConfigJson);
    const parameterHash = hashParameterValues(parameterValues);

    const createdRecords = await this.prisma.$transaction(async (transaction) => {
      const experiment = await transaction.experiment.create({
        data: {
          name: input.name,
          strategyTemplateId: strategyTemplate.id,
          parameterSpaceId: parameterSpace.id,
          status: "PENDING",
          objectiveConfigJson: {
            primaryMetric: "netProfit"
          } as Prisma.InputJsonValue,
          rankingProfileJson: {
            mode: "not-yet-implemented"
          } as Prisma.InputJsonValue,
          stageCount: 1
        }
      });

      const run = await transaction.experimentRun.create({
        data: {
          experimentId: experiment.id,
          stageNumber: 1,
          parameterHash,
          parameterValuesJson: toPrismaJson(parameterValues),
          status: "QUEUED"
        }
      });

      return {
        experiment,
        run
      };
    });

    try {
      await this.orchestrator.enqueueRunExecution({
        experimentId: createdRecords.experiment.id,
        runId: createdRecords.run.id,
        stageNumber: createdRecords.run.stageNumber,
        strategyTemplateId: strategyTemplate.id,
        strategyTemplateVersion: strategyTemplate.version,
        parameterValues: toRunParameterValues(parameterValues)
      });
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.experiment.update({
          where: {
            id: createdRecords.experiment.id
          },
          data: {
            status: "FAILED"
          }
        }),
        this.prisma.experimentRun.update({
          where: {
            id: createdRecords.run.id
          },
          data: {
            status: "FAILED",
            failureCode: "QUEUE_ENQUEUE_FAILED",
            finishedAt: new Date()
          }
        })
      ]);

      throw error;
    }

    return {
      experiment: mapExperiment(createdRecords.experiment),
      run: mapRun(createdRecords.run)
    };
  }

  public async listRuns(query: ListRunsQuery): Promise<
    Array<{
      run: SharedExperimentRun;
      experiment: Pick<SharedExperiment, "id" | "name" | "status">;
      result: SharedBacktestResult | null;
      artifacts: SharedRunArtifact[];
    }>
  > {
    const runs = await this.prisma.experimentRun.findMany({
      where: query.experimentId
        ? {
            experimentId: query.experimentId
          }
        : undefined,
      include: {
        backtestResult: true,
        artifacts: {
          orderBy: {
            capturedAt: "asc"
          }
        },
        experiment: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return runs.map((runRecord) => ({
      run: mapRun(runRecord),
      experiment: {
        id: runRecord.experiment.id,
        name: runRecord.experiment.name,
        status: mapExperiment(runRecord.experiment).status
      },
      result: runRecord.backtestResult ? mapBacktestResult(runRecord.backtestResult) : null,
      artifacts: runRecord.artifacts.map(mapRunArtifact)
    }));
  }

  public async summarizeRuns(query: ListRunsQuery): Promise<RunAnalyticsSnapshot> {
    const runRecords = await this.prisma.experimentRun.findMany({
      where: query.experimentId
        ? {
            experimentId: query.experimentId
          }
        : undefined,
      include: {
        backtestResult: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return buildRunAnalyticsSnapshot(
      runRecords.map((runRecord) => ({
        runId: runRecord.id,
        status: mapRunStatus(runRecord.status),
        occurredAt:
          runRecord.finishedAt?.toISOString() ??
          runRecord.startedAt?.toISOString() ??
          runRecord.createdAt.toISOString(),
        netProfit: runRecord.backtestResult?.netProfit ?? null,
        tradeCount: runRecord.backtestResult?.tradeCount ?? null,
        maxDrawdown: runRecord.backtestResult?.maxDrawdown ?? null
      }))
    );
  }

  public async getRunDetails(runId: string): Promise<{
    run: SharedExperimentRun;
    experiment: SharedExperiment;
    template: SharedStrategyTemplate;
    parameterSpace: SharedParameterSpace;
    result: SharedBacktestResult | null;
    artifacts: SharedRunArtifact[];
  }> {
    const runRecord = await this.prisma.experimentRun.findUnique({
      where: {
        id: runId
      },
      include: {
        backtestResult: true,
        artifacts: {
          orderBy: {
            capturedAt: "asc"
          }
        },
        experiment: {
          include: {
            strategyTemplate: true,
            parameterSpace: true
          }
        }
      }
    });

    if (runRecord === null) {
      throw new ApiRouteError(404, "Run not found.");
    }

    return {
      run: mapRun(runRecord),
      experiment: mapExperiment(runRecord.experiment),
      template: mapStrategyTemplate(runRecord.experiment.strategyTemplate),
      parameterSpace: mapParameterSpace(runRecord.experiment.parameterSpace),
      result: runRecord.backtestResult ? mapBacktestResult(runRecord.backtestResult) : null,
      artifacts: runRecord.artifacts.map(mapRunArtifact)
    };
  }
}

function mapStrategyTemplate(record: StrategyTemplateRecord): SharedStrategyTemplate {
  return {
    id: record.id,
    templateKey: record.templateKey,
    version: record.version,
    displayName: record.displayName,
    workflowKey: record.workflowKey,
    status: mapTemplateStatus(record.status),
    parameterDefinitions: cloneFixedBacktestParameterDefinitions(),
    parserConfig: readOptionalJsonObject(record.parserConfigJson),
    normalizationConfig: readOptionalJsonObject(record.normalizationConfigJson),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapParameterSpace(record: ParameterSpaceRecord): SharedParameterSpace {
  return {
    id: record.id,
    strategyTemplateId: record.strategyTemplateId,
    name: record.name,
    values: toParameterSpaceValues(readStoredFixedBacktestValues(record.spaceConfigJson)),
    searchPolicy: readJsonObject(record.searchPolicyJson),
    validationSummary: readOptionalJsonObject(record.validationSummaryJson),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapExperiment(record: ExperimentRecord): SharedExperiment {
  return {
    id: record.id,
    name: record.name,
    strategyTemplateId: record.strategyTemplateId,
    parameterSpaceId: record.parameterSpaceId,
    status: mapExperimentStatus(record.status),
    stageCount: record.stageCount,
    objectiveConfig: readJsonObject(record.objectiveConfigJson),
    rankingProfile: readJsonObject(record.rankingProfileJson),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapRun(record: RunListRecord | RunDetailsRecord | Prisma.ExperimentRunGetPayload<Record<string, never>>): SharedExperimentRun {
  return {
    id: record.id,
    experimentId: record.experimentId,
    stageNumber: record.stageNumber,
    parameterHash: record.parameterHash,
    parameterValues: toRunParameterValues(readStoredFixedBacktestValues(record.parameterValuesJson)),
    status: mapRunStatus(record.status),
    attemptCount: record.attemptCount,
    failureCode: record.failureCode ?? undefined,
    workerId: record.workerId ?? undefined,
    startedAt: record.startedAt?.toISOString(),
    finishedAt: record.finishedAt?.toISOString()
  };
}

function mapRunArtifact(record: RunArtifactRecord): SharedRunArtifact {
  return {
    id: record.id,
    experimentRunId: record.experimentRunId,
    artifactType: mapArtifactType(record.artifactType),
    storageRef: record.storageRef,
    mimeType: record.mimeType,
    stepName: record.stepName ?? undefined,
    capturedAt: record.capturedAt.toISOString()
  };
}

function mapBacktestResult(record: BacktestResultRecord): SharedBacktestResult {
  const normalizedMetrics = readNormalizedMetrics(record.normalizedMetricsJson);

  return {
    id: record.id,
    experimentRunId: record.experimentRunId,
    success: record.success,
    rawPayload: readJsonObject(record.rawPayloadJson),
    normalizedMetrics,
    netProfit: record.netProfit,
    tradeCount: record.tradeCount,
    maxDrawdown: record.maxDrawdown,
    parserVersion: record.parserVersion,
    parsedAt: record.parsedAt.toISOString()
  };
}

function mapArtifactType(artifactType: RunArtifactRecord["artifactType"]): SharedRunArtifact["artifactType"] {
  switch (artifactType) {
    case "SCREENSHOT":
      return "screenshot";
    case "HTML_SNAPSHOT":
      return "html-snapshot";
    case "NETWORK_LOG":
      return "network-log";
    case "TRACE":
      return "trace";
    case "RAW_PAYLOAD":
      return "raw-payload";
    case "METRICS_JSON":
      return "metrics-json";
    default:
      return exhaustiveGuard(artifactType);
  }
}

function readStoredFixedBacktestValues(value: Prisma.JsonValue): FixedBacktestParameterValues {
  const record = readJsonObject(value);

  return validateFixedBacktestValues({
    take_profit_percent: readRequiredNumber(record["take_profit_percent"], "take_profit_percent"),
    stop_loss_percent: readRequiredNumber(record["stop_loss_percent"], "stop_loss_percent")
  });
}

function readNormalizedMetrics(value: Prisma.JsonValue): NormalizedBacktestMetrics {
  const record = readJsonObject(value);

  return {
    netProfit: readOptionalNumber(record["netProfit"]),
    tradeCount: readOptionalInteger(record["tradeCount"]),
    maxDrawdown: readOptionalNumber(record["maxDrawdown"])
  };
}

function readJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected Prisma JSON value to be an object.");
  }

  return value as Record<string, unknown>;
}

function readOptionalJsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (value === null) {
    return undefined;
  }

  return readJsonObject(value);
}

function readOptionalJsonArray(value: Prisma.JsonValue | null): Array<string | number | boolean | null> | undefined {
  if (value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("Expected Prisma JSON value to be an array.");
  }

  return value as Array<string | number | boolean | null>;
}

function readRequiredNumber(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected \`${key}\` to be a finite number.`);
  }

  return value;
}

function readOptionalNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function readOptionalInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function hashParameterValues(values: FixedBacktestParameterValues): string {
  const orderedEntries = Object.entries(values).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return createHash("sha256").update(JSON.stringify(orderedEntries)).digest("hex");
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toParameterSpaceValues(values: FixedBacktestParameterValues): SharedParameterSpace["values"] {
  return {
    take_profit_percent: values.take_profit_percent,
    stop_loss_percent: values.stop_loss_percent
  };
}

function toRunParameterValues(values: FixedBacktestParameterValues): Record<string, ParameterValue> {
  return {
    take_profit_percent: values.take_profit_percent,
    stop_loss_percent: values.stop_loss_percent
  };
}

function mapTemplateStatus(status: string): SharedStrategyTemplate["status"] {
  const statusMap: Record<string, SharedStrategyTemplate["status"]> = {
    DRAFT: "draft",
    ACTIVE: "active",
    DEPRECATED: "deprecated"
  };
  const mapped = statusMap[status];
  if (mapped === undefined) {
    throw new Error(`Unknown strategy template status from database: ${status}`);
  }
  return mapped;
}

function mapExperimentStatus(status: string): SharedExperiment["status"] {
  const statusMap: Record<string, SharedExperiment["status"]> = {
    DRAFT: "draft",
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled"
  };
  const mapped = statusMap[status];
  if (mapped === undefined) {
    throw new Error(`Unknown experiment status from database: ${status}`);
  }
  return mapped;
}

function mapRunStatus(status: string): SharedExperimentRun["status"] {
  const statusMap: Record<string, SharedExperimentRun["status"]> = {
    PENDING: "pending",
    QUEUED: "queued",
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    CANCELLED: "cancelled"
  };
  const mapped = statusMap[status];
  if (mapped === undefined) {
    throw new Error(`Unknown run status from database: ${status}`);
  }
  return mapped;
}

function isUniqueConstraintError(error: unknown): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}

function exhaustiveGuard(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
