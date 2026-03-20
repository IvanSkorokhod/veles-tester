import { hostname } from "node:os";

import type { Job } from "bullmq";
import type { Prisma } from "@prisma/client";
import { JOB_NAMES, FIXED_BACKTEST_WORKFLOW_KEY, cloneFixedBacktestParameterDefinitions, type ResultParseJobPayload, type RunExecuteJobPayload, type StrategyTemplate, type VelesBrowserAdapter } from "@veles/shared";
import type { Queue } from "bullmq";

import { prisma } from "../../infrastructure/prisma.js";
import type { FilesystemArtifactStore } from "../../modules/artifacts/filesystem-artifact-store.js";
import { VelesAutomationError } from "../../modules/veles-adapter/veles-automation.error.js";

type StrategyTemplateRecord = Prisma.StrategyTemplateGetPayload<Record<string, never>>;

export class RunExecuteProcessor {
  public constructor(
    private readonly adapter: VelesBrowserAdapter,
    private readonly artifactStore: FilesystemArtifactStore,
    private readonly resultPostprocessingQueue: Queue<ResultParseJobPayload>
  ) {}

  public async handle(job: Job<RunExecuteJobPayload>): Promise<void> {
    const runRecord = await prisma.experimentRun.findUnique({
      where: {
        id: job.data.runId
      },
      include: {
        experiment: {
          include: {
            strategyTemplate: true
          }
        }
      }
    });

    if (runRecord === null) {
      throw new Error(`Run ${job.data.runId} no longer exists.`);
    }

    if (runRecord.experiment.strategyTemplate.workflowKey !== FIXED_BACKTEST_WORKFLOW_KEY) {
      throw new Error(
        `Workflow ${runRecord.experiment.strategyTemplate.workflowKey} is not supported by the fixed MVP run.execute processor.`
      );
    }

    if (runRecord.status === "SUCCEEDED") {
      return;
    }

    const workerId = `${hostname()}:${process.pid}`;

    await prisma.$transaction([
      prisma.experiment.update({
        where: {
          id: runRecord.experimentId
        },
        data: {
          status: "RUNNING"
        }
      }),
      prisma.experimentRun.update({
        where: {
          id: runRecord.id
        },
        data: {
          status: "RUNNING",
          attemptCount: {
            increment: 1
          },
          failureCode: null,
          workerId,
          startedAt: runRecord.startedAt ?? new Date()
        }
      })
    ]);

    try {
      const response = await this.adapter.executeBacktest({
        runId: runRecord.id,
        template: buildStrategyTemplate(runRecord.experiment.strategyTemplate),
        parameterValues: job.data.parameterValues,
        session: {
          sessionId: "default-veles-session"
        }
      });
      const rawPayloadArtifact = await this.artifactStore.writeJsonArtifact(
        runRecord.id,
        "raw-payload",
        "execution-payload",
        response.rawPayload
      );

      await persistArtifacts(runRecord.id, [...response.artifacts, rawPayloadArtifact]);

      await this.resultPostprocessingQueue.add(
        JOB_NAMES.resultParse,
        {
          runId: runRecord.id,
          experimentId: runRecord.experimentId
        },
        {
          jobId: `${JOB_NAMES.resultParse}:${runRecord.id}`
        }
      );
    } catch (error) {
      if (error instanceof VelesAutomationError) {
        await persistArtifacts(runRecord.id, error.artifacts);
      }

      await prisma.$transaction([
        prisma.experiment.update({
          where: {
            id: runRecord.experimentId
          },
          data: {
            status: "FAILED"
          }
        }),
        prisma.experimentRun.update({
          where: {
            id: runRecord.id
          },
          data: {
            status: "FAILED",
            failureCode: error instanceof VelesAutomationError ? "VELES_AUTOMATION_FAILED" : "RUN_EXECUTE_FAILED",
            workerId,
            finishedAt: new Date()
          }
        })
      ]);

      throw error;
    }
  }
}

async function persistArtifacts(
  runId: string,
  artifacts: Array<{
    artifactType: "screenshot" | "html-snapshot" | "network-log" | "trace" | "raw-payload" | "metrics-json";
    storageRef: string;
    mimeType: string;
    stepName?: string;
  }>
): Promise<void> {
  if (artifacts.length === 0) {
    return;
  }

  await prisma.runArtifact.createMany({
    data: artifacts.map((artifact) => ({
      experimentRunId: runId,
      artifactType: mapArtifactType(artifact.artifactType),
      storageRef: artifact.storageRef,
      mimeType: artifact.mimeType,
      stepName: artifact.stepName,
      capturedAt: new Date()
    }))
  });
}

function buildStrategyTemplate(
  templateRecord: StrategyTemplateRecord
): StrategyTemplate {
  return {
    id: templateRecord.id,
    templateKey: templateRecord.templateKey,
    version: templateRecord.version,
    displayName: templateRecord.displayName,
    workflowKey: templateRecord.workflowKey,
    status: mapTemplateStatus(templateRecord.status),
    parameterDefinitions: cloneFixedBacktestParameterDefinitions(),
    parserConfig: readOptionalJsonObject(templateRecord.parserConfigJson),
    normalizationConfig: readOptionalJsonObject(templateRecord.normalizationConfigJson),
    createdAt: templateRecord.createdAt.toISOString(),
    updatedAt: templateRecord.updatedAt.toISOString()
  };
}

function mapTemplateStatus(status: string): StrategyTemplate["status"] {
  const statusMap: Record<string, StrategyTemplate["status"]> = {
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

function readOptionalJsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function mapArtifactType(artifactType: "screenshot" | "html-snapshot" | "network-log" | "trace" | "raw-payload" | "metrics-json") {
  switch (artifactType) {
    case "screenshot":
      return "SCREENSHOT";
    case "html-snapshot":
      return "HTML_SNAPSHOT";
    case "network-log":
      return "NETWORK_LOG";
    case "trace":
      return "TRACE";
    case "raw-payload":
      return "RAW_PAYLOAD";
    case "metrics-json":
      return "METRICS_JSON";
    default:
      return exhaustiveGuard(artifactType);
  }
}

function exhaustiveGuard(value: never): never {
  throw new Error(`Unhandled artifact type ${String(value)}.`);
}
