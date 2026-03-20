import type { ParameterDefinition } from "./parameter-schema.js";

export const FIXED_BACKTEST_WORKFLOW_KEY = "veles.fixed-backtest.v1";
export const FIXED_BACKTEST_TEMPLATE_KEY = "veles-fixed-backtest";
export const FIXED_BACKTEST_PARSER_VERSION = "veles-fixed-backtest-parser.v1";

export const FIXED_BACKTEST_PARAMETER_KEYS = {
  takeProfitPercent: "take_profit_percent",
  stopLossPercent: "stop_loss_percent"
} as const;

export type FixedBacktestParameterKey =
  (typeof FIXED_BACKTEST_PARAMETER_KEYS)[keyof typeof FIXED_BACKTEST_PARAMETER_KEYS];

export interface FixedBacktestParameterValues {
  take_profit_percent: number;
  stop_loss_percent: number;
}

export interface FixedBacktestRawMetrics {
  netProfit: string;
  tradeCount: string;
  maxDrawdown: string;
}

export const FIXED_BACKTEST_PARAMETER_DEFINITIONS: ReadonlyArray<ParameterDefinition> = [
  {
    key: FIXED_BACKTEST_PARAMETER_KEYS.takeProfitPercent,
    label: "Take Profit %",
    type: "number",
    selector: {
      strategy: "controlKey",
      value: FIXED_BACKTEST_PARAMETER_KEYS.takeProfitPercent
    },
    range: {
      min: 0.1,
      max: 100,
      step: 0.1
    },
    normalizationHints: {
      unit: "percent"
    }
  },
  {
    key: FIXED_BACKTEST_PARAMETER_KEYS.stopLossPercent,
    label: "Stop Loss %",
    type: "number",
    selector: {
      strategy: "controlKey",
      value: FIXED_BACKTEST_PARAMETER_KEYS.stopLossPercent
    },
    range: {
      min: 0.1,
      max: 100,
      step: 0.1
    },
    normalizationHints: {
      unit: "percent"
    }
  }
];

export function isFixedBacktestParameterKey(value: string): value is FixedBacktestParameterKey {
  return Object.values(FIXED_BACKTEST_PARAMETER_KEYS).includes(value as FixedBacktestParameterKey);
}

export function cloneFixedBacktestParameterDefinitions(): ParameterDefinition[] {
  return FIXED_BACKTEST_PARAMETER_DEFINITIONS.map((definition) => ({
    ...definition,
    selector: {
      ...definition.selector
    },
    range: definition.range ? { ...definition.range } : undefined,
    dependencies: definition.dependencies?.map((dependency) => ({ ...dependency })),
    parserHints: definition.parserHints ? { ...definition.parserHints } : undefined,
    normalizationHints: definition.normalizationHints ? { ...definition.normalizationHints } : undefined
  }));
}
