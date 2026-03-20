import type { ParsedBacktestResult, ResultParser } from "@veles/shared";

export class DefaultResultParser implements ResultParser {
  public async parse(_rawPayload: Record<string, unknown>): Promise<ParsedBacktestResult> {
    throw new Error("TODO: implement Veles result parsing and metric normalization.");
  }
}
