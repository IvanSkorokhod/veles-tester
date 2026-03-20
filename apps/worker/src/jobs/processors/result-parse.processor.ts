import type { Job } from "bullmq";
import type { Prisma } from "@prisma/client";
import type { ResultParseJobPayload, ResultParser } from "@veles/shared";

import { prisma } from "../../infrastructure/prisma.js";
import type { FilesystemArtifactStore } from "../../modules/artifacts/filesystem-artifact-store.js";

export class ResultParseProcessor {
  public constructor(
    private readonly parser: ResultParser,
    private readonly artifactStore: FilesystemArtifactStore
  ) {}

  public async handle(job: Job<ResultParseJobPayload>): Promise<void> {
    const runRecord = await prisma.experimentRun.findUnique({
      where: {
        id: job.data.runId
      }
    });

    if (runRecord === null) {
      throw new Error(`Run ${job.data.runId} no longer exists.`);
    }

    try {
      const rawPayloadArtifact = await prisma.runArtifact.findFirst({
        where: {
          experimentRunId: job.data.runId,
          artifactType: "RAW_PAYLOAD"
        },
        orderBy: {
          capturedAt: "asc"
        }
      });

      if (rawPayloadArtifact === null) {
        throw new Error(`Run ${job.data.runId} does not have a raw payload artifact to parse.`);
      }

      const rawPayload = await this.artifactStore.readJsonArtifact(rawPayloadArtifact.storageRef);
      const parsedResult = await this.parser.parse(rawPayload);
      const metricsArtifact = await this.artifactStore.writeJsonArtifact(
        job.data.runId,
        "metrics-json",
        "normalized-metrics",
        {
          parserVersion: parsedResult.parserVersion,
          normalizedMetrics: parsedResult.normalizedMetrics
        }
      );
      const parsedAt = new Date();

      try {
        await prisma.$transaction([
          prisma.backtestResult.upsert({
          where: {
            experimentRunId: job.data.runId
          },
            create: {
              experimentRunId: job.data.runId,
              success: true,
              netProfit: parsedResult.normalizedMetrics.netProfit,
              tradeCount: parsedResult.normalizedMetrics.tradeCount,
              maxDrawdown: parsedResult.normalizedMetrics.maxDrawdown,
              rawPayloadJson: parsedResult.rawPayload as Prisma.InputJsonValue,
              normalizedMetricsJson: toNormalizedMetricsJson(parsedResult.normalizedMetrics),
              parserVersion: parsedResult.parserVersion,
              parsedAt
            },
            update: {
              success: true,
              netProfit: parsedResult.normalizedMetrics.netProfit,
              tradeCount: parsedResult.normalizedMetrics.tradeCount,
              maxDrawdown: parsedResult.normalizedMetrics.maxDrawdown,
              rawPayloadJson: parsedResult.rawPayload as Prisma.InputJsonValue,
              normalizedMetricsJson: toNormalizedMetricsJson(parsedResult.normalizedMetrics),
              parserVersion: parsedResult.parserVersion,
              parsedAt
            }
          }),
          prisma.runArtifact.create({
            data: {
              experimentRunId: job.data.runId,
              artifactType: "METRICS_JSON",
              storageRef: metricsArtifact.storageRef,
              mimeType: metricsArtifact.mimeType,
              stepName: metricsArtifact.stepName,
              capturedAt: parsedAt
            }
          }),
          prisma.experimentRun.update({
            where: {
              id: job.data.runId
            },
            data: {
              status: "SUCCEEDED",
              failureCode: null,
              finishedAt: parsedAt
            }
          }),
          prisma.experiment.update({
            where: {
              id: job.data.experimentId
            },
            data: {
              status: "COMPLETED"
            }
          })
        ]);
      } catch (transactionError) {
        await this.artifactStore.deleteArtifact(metricsArtifact.storageRef);
        throw transactionError;
      }
    } catch (error) {
      await prisma.$transaction([
        prisma.experimentRun.update({
          where: {
            id: job.data.runId
          },
          data: {
            status: "FAILED",
            failureCode: "RESULT_PARSE_FAILED",
            finishedAt: new Date()
          }
        }),
        prisma.experiment.update({
          where: {
            id: job.data.experimentId
          },
          data: {
            status: "FAILED"
          }
        })
      ]);

      throw error;
    }
  }
}

function toNormalizedMetricsJson(normalizedMetrics: {
  netProfit: number | null;
  tradeCount: number | null;
  maxDrawdown: number | null;
}): Prisma.InputJsonValue {
  return {
    netProfit: normalizedMetrics.netProfit,
    tradeCount: normalizedMetrics.tradeCount,
    maxDrawdown: normalizedMetrics.maxDrawdown
  };
}
