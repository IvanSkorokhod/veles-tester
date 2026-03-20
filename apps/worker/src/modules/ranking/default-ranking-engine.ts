import type { RankedCandidate, RankingCandidate, RankingEngine } from "@veles/shared";

export class DefaultRankingEngine implements RankingEngine {
  public async rank(_candidates: RankingCandidate[]): Promise<RankedCandidate[]> {
    throw new Error("TODO: implement profitability and robustness ranking.");
  }
}
