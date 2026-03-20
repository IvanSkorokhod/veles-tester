import { FIXED_BACKTEST_PARAMETER_KEYS, type FixedBacktestParameterKey } from "@veles/shared";

export interface VelesLoginSelectorConfig {
  loginPath: string;
  loginFormIndicator: string;
  usernameInput: string;
  passwordInput: string;
  submitButton: string;
  loggedInIndicator: string;
}

export interface VelesBacktestSelectorConfig {
  backtestPath: string;
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
    login: {
      loginPath: "TODO_CAPTURE_LOGIN_PATH",
      loginFormIndicator: "TODO_CAPTURE_LOGIN_FORM_SELECTOR",
      usernameInput: "TODO_CAPTURE_USERNAME_INPUT_SELECTOR",
      passwordInput: "TODO_CAPTURE_PASSWORD_INPUT_SELECTOR",
      submitButton: "TODO_CAPTURE_LOGIN_SUBMIT_SELECTOR",
      loggedInIndicator: "TODO_CAPTURE_LOGGED_IN_INDICATOR_SELECTOR"
    },
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

/**
 * Validates that all selectors in the registry have been filled in.
 * Call this at worker startup to fail fast instead of discovering
 * placeholder selectors mid-job.
 */
export function assertSelectorRegistryConfigured(): void {
  const placeholders: string[] = [];

  function checkObject(obj: Record<string, unknown>, path: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = `${path}.${key}`;
      if (typeof value === "string" && value.startsWith("TODO_CAPTURE_")) {
        placeholders.push(fullPath);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        checkObject(value as Record<string, unknown>, fullPath);
      }
    }
  }

  checkObject(velesSelectorRegistry as unknown as Record<string, unknown>, "velesSelectorRegistry");

  if (placeholders.length > 0) {
    throw new Error(
      `Worker startup aborted: ${placeholders.length} selector(s) are still placeholders in veles-selector-registry.ts:\n` +
        placeholders.map((p) => `  - ${p}`).join("\n") +
        "\nCapture the real Veles selectors before starting the worker."
    );
  }
}
