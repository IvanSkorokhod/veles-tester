import type { Job } from "bullmq";
import type { RunRetryJobPayload } from "@veles/shared";

export async function processRunRetry(job: Job<RunRetryJobPayload>): Promise<void> {
  throw new Error(`TODO: implement run.retry for ${job.data.runId} attempt ${job.data.attemptNumber}.`);
}
