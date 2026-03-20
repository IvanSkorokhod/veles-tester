import { hostname } from "node:os";

import type { Job } from "bullmq";
import { JOB_NAMES, FIXED_BACKTEST_WORKFLOW_KEY, type ResultParseJobPayload, type RunExecuteJobPayload, type VelesBrowserAdapter } from "@veles/shared";
import type { Queue } from "bullmq";

import { prisma } from "../../infrastructure/prisma.js";
import type { FilesystemArtifactStore } from "../../modules/artifacts/filesystem-artifact-store.js";
import type { ConnectedBrowserSession } from "../../modules/veles-adapter/browser-session.connector.js";
import type { ResolvedAuthenticatedContext } from "../../modules/veles-adapter/authenticated-context.resolver.js";
import type { VelesBacktestPage } from "../../modules/veles-adapter/pages/backtest-page.js";

export class RunExecuteProcessor {
  public constructor(
    private readonly adapter: VelesBrowserAdapter<
      ConnectedBrowserSession,
      ResolvedAuthenticatedContext,
      VelesBacktestPage
    >,
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

    let backtestPage: VelesBacktestPage | undefined;

    try {
      const session = {
        sessionId: "default-veles-session"
      };
      const browserSession = await this.adapter.connectToBrowserSession(session);
      const authenticatedContext = await this.adapter.resolveAuthenticatedContext(browserSession, session);

      backtestPage = await this.adapter.openBacktestPage(authenticatedContext);

      const artifacts = await this.adapter.captureArtifacts(backtestPage, runRecord.id, "before-run", {
        screenshot: true
      });
      await this.adapter.applyParameterValues(backtestPage, job.data.parameterValues);
      await this.adapter.runBacktest(backtestPage);
      await this.adapter.waitForBacktestCompletion(backtestPage);

      const metrics = await this.adapter.readMetrics(backtestPage);
      artifacts.push(
        ...(await this.adapter.captureArtifacts(backtestPage, runRecord.id, "after-run", {
          screenshot: true,
          html: true
        }))
      );

      const rawPayload = {
        runId: runRecord.id,
        workflowKey: runRecord.experiment.strategyTemplate.workflowKey,
        templateKey: runRecord.experiment.strategyTemplate.templateKey,
        templateVersion: runRecord.experiment.strategyTemplate.version,
        pageUrl: backtestPage.page.url(),
        capturedAt: new Date().toISOString(),
        parameterValues: job.data.parameterValues,
        metrics
      };

      const rawPayloadArtifact = await this.artifactStore.writeJsonArtifact(
        runRecord.id,
        "raw-payload",
        "execution-payload",
        rawPayload
      );

      await persistArtifacts(runRecord.id, [...artifacts, rawPayloadArtifact]);

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
      if (backtestPage !== undefined) {
        const failureArtifacts = await this.adapter
          .captureArtifacts(backtestPage, runRecord.id, "failure", {
            screenshot: true,
            html: true
          })
          .catch(() => []);

        if (failureArtifacts.length > 0) {
          await persistArtifacts(runRecord.id, failureArtifacts);
        }
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
            failureCode: "RUN_EXECUTE_FAILED",
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
