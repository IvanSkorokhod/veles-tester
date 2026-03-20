export interface ParsedBacktestResult {
  rawPayload: Record<string, unknown>;
  normalizedMetrics: Record<string, number | string | boolean | null>;
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
