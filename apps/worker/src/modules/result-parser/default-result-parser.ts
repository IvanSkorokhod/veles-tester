import { FIXED_BACKTEST_PARSER_VERSION, type FixedBacktestRawMetrics, type ParsedBacktestResult, type ResultParser } from "@veles/shared";

export class DefaultResultParser implements ResultParser {
  public async parse(rawPayload: Record<string, unknown>): Promise<ParsedBacktestResult> {
    const metrics = readRawMetrics(rawPayload["metrics"]);
    const normalizedMetrics = {
      netProfit: parseDecimalMetric(metrics.netProfit),
      tradeCount: parseIntegerMetric(metrics.tradeCount),
      maxDrawdown: parseDecimalMetric(metrics.maxDrawdown)
    };

    if (
      normalizedMetrics.netProfit === null ||
      normalizedMetrics.tradeCount === null ||
      normalizedMetrics.maxDrawdown === null
    ) {
      throw new Error(
        "Raw Veles metrics could not be fully normalized. Confirm the page selectors and metric text formats."
      );
    }

    return {
      rawPayload,
      normalizedMetrics,
      parserVersion: FIXED_BACKTEST_PARSER_VERSION
    };
  }
}

function readRawMetrics(value: unknown): FixedBacktestRawMetrics {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Raw payload is missing the expected `metrics` object.");
  }

  const metrics = value as Record<string, unknown>;

  return {
    netProfit: readRequiredMetric(metrics, "netProfit"),
    tradeCount: readRequiredMetric(metrics, "tradeCount"),
    maxDrawdown: readRequiredMetric(metrics, "maxDrawdown")
  };
}

function readRequiredMetric(metrics: Record<string, unknown>, key: string): string {
  const value = metrics[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Raw payload metric \`${key}\` is missing or empty.`);
  }

  return value.trim();
}

function parseDecimalMetric(value: string): number | null {
  const normalizedValue = value.replace(/\s+/g, "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/u)?.[0];

  if (normalizedValue === undefined) {
    return null;
  }

  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseIntegerMetric(value: string): number | null {
  const parsedValue = parseDecimalMetric(value);

  if (parsedValue === null) {
    return null;
  }

  return Math.trunc(parsedValue);
}
