import {
  JOB_NAMES,
  type ExperimentCreateJobPayload,
  type ExperimentExpandJobPayload,
  type RunExecuteJobPayload
} from "@veles/shared";

import type { ApiQueues } from "../../infrastructure/queues.js";

export class ExperimentOrchestratorService {
  public constructor(private readonly queues: ApiQueues) {}

  public async enqueueExperimentCreate(payload: ExperimentCreateJobPayload): Promise<void> {
    await this.queues.experimentPlanning.add(JOB_NAMES.experimentCreate, payload, {
      jobId: `${JOB_NAMES.experimentCreate}:${payload.experimentId}`
    });
  }

  public async enqueueExperimentExpand(payload: ExperimentExpandJobPayload): Promise<void> {
    await this.queues.experimentPlanning.add(JOB_NAMES.experimentExpand, payload, {
      jobId: `${JOB_NAMES.experimentExpand}:${payload.experimentId}:${payload.stageNumber}`
    });
  }

  public async enqueueRunExecution(payload: RunExecuteJobPayload): Promise<void> {
    await this.queues.backtestExecution.add(JOB_NAMES.runExecute, payload, {
      jobId: `${JOB_NAMES.runExecute}:${payload.runId}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      }
    });
  }
}
