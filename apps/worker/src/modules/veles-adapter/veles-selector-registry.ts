import { FIXED_BACKTEST_PARAMETER_KEYS, type FixedBacktestParameterKey } from "@veles/shared";

export interface VelesBacktestSelectorConfig {
  backtestPath?: string;
  pageReadyIndicator: string;
  runButton: string;
  completionIndicator: string;
  parameterInputs: Record<FixedBacktestParameterKey, string>;
  metricSelectors: {
    netProfit: string;
    tradeCount: string;
    maxDrawdown: string;
  };
}

export const velesSelectorRegistry = {
  fixedBacktest: {
    backtest: {
      backtestPath: "TODO_CAPTURE_BACKTEST_PATH",
      pageReadyIndicator: "TODO_CAPTURE_BACKTEST_PAGE_READY_SELECTOR",
      runButton: "TODO_CAPTURE_RUN_BACKTEST_BUTTON_SELECTOR",
      completionIndicator: "TODO_CAPTURE_BACKTEST_COMPLETION_INDICATOR_SELECTOR",
      parameterInputs: {
        [FIXED_BACKTEST_PARAMETER_KEYS.takeProfitPercent]:
          "TODO_CAPTURE_TAKE_PROFIT_PERCENT_INPUT_SELECTOR",
        [FIXED_BACKTEST_PARAMETER_KEYS.stopLossPercent]:
          "TODO_CAPTURE_STOP_LOSS_PERCENT_INPUT_SELECTOR"
      },
      metricSelectors: {
        netProfit: "TODO_CAPTURE_NET_PROFIT_SELECTOR",
        tradeCount: "TODO_CAPTURE_TRADE_COUNT_SELECTOR",
        maxDrawdown: "TODO_CAPTURE_MAX_DRAWDOWN_SELECTOR"
      }
    }
  }
} as const;

export function resolveConfiguredSelector(selectorName: string, selectorValue: string): string {
  if (selectorValue.startsWith("TODO_CAPTURE_")) {
    throw new Error(
      `Selector or path \`${selectorName}\` is still a placeholder. Capture the real Veles value in veles-selector-registry.ts before running live automation.`
    );
  }

  return selectorValue;
}
