import { Worker } from "bullmq";
import { JOB_NAMES, QUEUE_NAMES } from "@veles/shared";

import { loadWorkerEnv } from "./infrastructure/env.js";
import { redisConnectionOptionsFromUrl } from "./infrastructure/redis.js";
import { processExperimentCreate } from "./jobs/processors/experiment-create.processor.js";
import { processExperimentExpand } from "./jobs/processors/experiment-expand.processor.js";
import { RankingRecalculateProcessor } from "./jobs/processors/ranking-recalculate.processor.js";
import { ResultParseProcessor } from "./jobs/processors/result-parse.processor.js";
import { RunExecuteProcessor } from "./jobs/processors/run-execute.processor.js";
import { processRunRetry } from "./jobs/processors/run-retry.processor.js";
import { DiscoveryService } from "./modules/discovery/discovery.service.js";
import { DefaultRankingEngine } from "./modules/ranking/default-ranking-engine.js";
import { DefaultResultParser } from "./modules/result-parser/default-result-parser.js";
import { PlaywrightVelesAdapter } from "./modules/veles-adapter/index.js";

const env = loadWorkerEnv();
const connection = redisConnectionOptionsFromUrl(env.redisUrl);

const velesAdapter = new PlaywrightVelesAdapter(env.playwrightHeadless);
const resultParser = new DefaultResultParser();
const rankingEngine = new DefaultRankingEngine();
const discoveryService = new DiscoveryService(velesAdapter);

void discoveryService;

const runExecuteProcessor = new RunExecuteProcessor(velesAdapter);
const resultParseProcessor = new ResultParseProcessor(resultParser);
const rankingRecalculateProcessor = new RankingRecalculateProcessor(rankingEngine);

const experimentPlanningWorker = new Worker(
  QUEUE_NAMES.experimentPlanning,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.experimentCreate:
        return processExperimentCreate(job);
      case JOB_NAMES.experimentExpand:
        return processExperimentExpand(job);
      default:
        throw new Error(`Unsupported experiment planning job: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: env.workerConcurrency
  }
);

const backtestExecutionWorker = new Worker(
  QUEUE_NAMES.backtestExecution,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.runExecute:
        return runExecuteProcessor.handle(job);
      case JOB_NAMES.runRetry:
        return processRunRetry(job);
      default:
        throw new Error(`Unsupported backtest execution job: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: env.workerConcurrency
  }
);

const resultPostprocessingWorker = new Worker(
  QUEUE_NAMES.resultPostprocessing,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.resultParse:
        return resultParseProcessor.handle(job);
      case JOB_NAMES.rankingRecalculate:
        return rankingRecalculateProcessor.handle(job);
      default:
        throw new Error(`Unsupported postprocessing job: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: env.workerConcurrency
  }
);

const workers = [experimentPlanningWorker, backtestExecutionWorker, resultPostprocessingWorker];

async function shutdown(): Promise<void> {
  await Promise.all(workers.map(async (worker) => worker.close()));
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown().finally(() => process.exit(0));
  });
}

console.log("Worker runtime started with queues:", Object.values(QUEUE_NAMES).join(", "));
