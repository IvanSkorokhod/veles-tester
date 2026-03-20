import type { Job } from "bullmq";
import type { RunExecuteJobPayload, VelesBrowserAdapter } from "@veles/shared";

export class RunExecuteProcessor {
  public constructor(private readonly adapter: VelesBrowserAdapter) {}

  public async handle(job: Job<RunExecuteJobPayload>): Promise<void> {
    void this.adapter;

    throw new Error(`TODO: implement run.execute for ${job.data.runId}.`);
  }
}
