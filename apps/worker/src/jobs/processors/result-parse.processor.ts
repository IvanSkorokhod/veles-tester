import type { Job } from "bullmq";
import type { ResultParseJobPayload, ResultParser } from "@veles/shared";

export class ResultParseProcessor {
  public constructor(private readonly parser: ResultParser) {}

  public async handle(job: Job<ResultParseJobPayload>): Promise<void> {
    void this.parser;

    throw new Error(`TODO: implement result.parse for ${job.data.runId}.`);
  }
}
