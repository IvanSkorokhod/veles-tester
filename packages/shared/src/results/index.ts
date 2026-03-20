export interface NormalizedBacktestMetrics {
  netProfit: number | null;
  tradeCount: number | null;
  maxDrawdown: number | null;
}

export interface ParsedBacktestResult {
  rawPayload: Record<string, unknown>;
  normalizedMetrics: NormalizedBacktestMetrics;
  parserVersion: string;
}

export interface ResultParser {
  parse(rawPayload: Record<string, unknown>): Promise<ParsedBacktestResult>;
}

export interface RankingCandidate {
  runId: string;
  metrics: Record<string, number | string | boolean | null>;
}

export interface RankedCandidate {
  runId: string;
  score: number;
  breakdown: Record<string, number>;
}

export interface RankingEngine {
  rank(candidates: RankingCandidate[]): Promise<RankedCandidate[]>;
}
