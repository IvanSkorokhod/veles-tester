import type { Job } from "bullmq";
import type { ExperimentExpandJobPayload } from "@veles/shared";

export async function processExperimentExpand(job: Job<ExperimentExpandJobPayload>): Promise<void> {
  throw new Error(
    `TODO: implement experiment.expand for ${job.data.experimentId} stage ${job.data.stageNumber}.`
  );
}
