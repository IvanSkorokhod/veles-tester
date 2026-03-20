import type { Job } from "bullmq";
import type { ExperimentCreateJobPayload } from "@veles/shared";

export async function processExperimentCreate(job: Job<ExperimentCreateJobPayload>): Promise<void> {
  throw new Error(`TODO: implement experiment.create for ${job.data.experimentId}.`);
}
