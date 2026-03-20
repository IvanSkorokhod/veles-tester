import type { Job } from "bullmq";
import type { RankingEngine, RankingRecalculateJobPayload } from "@veles/shared";

export class RankingRecalculateProcessor {
  public constructor(private readonly rankingEngine: RankingEngine) {}

  public async handle(job: Job<RankingRecalculateJobPayload>): Promise<void> {
    void this.rankingEngine;

    throw new Error(
      `TODO: implement ranking.recalculate for ${job.data.experimentId} stage ${job.data.stageNumber}.`
    );
  }
}
