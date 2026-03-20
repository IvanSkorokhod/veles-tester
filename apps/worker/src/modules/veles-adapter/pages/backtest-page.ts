import { FIXED_BACKTEST_PARAMETER_KEYS, type FixedBacktestParameterKey, type FixedBacktestRawMetrics } from "@veles/shared";
import type { Page } from "playwright";

import { resolveConfiguredSelector, type VelesBacktestSelectorConfig } from "../veles-selector-registry.js";

export class VelesBacktestPage {
  public constructor(
    private readonly page: Page,
    private readonly baseUrl: string,
    private readonly selectors: VelesBacktestSelectorConfig
  ) {}

  public async open(): Promise<void> {
    await this.page.goto(this.buildUrl(this.selectors.backtestPath), {
      waitUntil: "domcontentloaded"
    });
    await this.waitUntilReady();
  }

  public async waitUntilReady(): Promise<void> {
    await this.page
      .locator(resolveConfiguredSelector("pageReadyIndicator", this.selectors.pageReadyIndicator))
      .waitFor({
        state: "visible",
        timeout: 30_000
      });
  }

  public async applyNumericParameter(controlKey: FixedBacktestParameterKey, value: number): Promise<void> {
    const parameterSelector = resolveConfiguredSelector(
      `parameterInputs.${controlKey}`,
      this.selectors.parameterInputs[controlKey]
    );
    const parameterInput = this.page.locator(parameterSelector);

    await parameterInput.waitFor({
      state: "visible",
      timeout: 10_000
    });
    await parameterInput.click({
      clickCount: 3
    });
    await parameterInput.fill(String(value));
  }

  public async runBacktest(): Promise<void> {
    await this.page.locator(resolveConfiguredSelector("runButton", this.selectors.runButton)).click();
  }

  public async waitForBacktestCompletion(): Promise<void> {
    await this.page
      .locator(resolveConfiguredSelector("completionIndicator", this.selectors.completionIndicator))
      .waitFor({
        state: "visible",
        timeout: 180_000
      });
  }

  public async readMetrics(): Promise<FixedBacktestRawMetrics> {
    return {
      netProfit: await this.readMetricText("metricSelectors.netProfit", this.selectors.metricSelectors.netProfit),
      tradeCount: await this.readMetricText("metricSelectors.tradeCount", this.selectors.metricSelectors.tradeCount),
      maxDrawdown: await this.readMetricText(
        "metricSelectors.maxDrawdown",
        this.selectors.metricSelectors.maxDrawdown
      )
    };
  }

  public getSupportedParameterKeys(): FixedBacktestParameterKey[] {
    return [FIXED_BACKTEST_PARAMETER_KEYS.takeProfitPercent, FIXED_BACKTEST_PARAMETER_KEYS.stopLossPercent];
  }

  private async readMetricText(selectorName: string, selectorValue: string): Promise<string> {
    const metricLocator = this.page.locator(resolveConfiguredSelector(selectorName, selectorValue));

    await metricLocator.waitFor({
      state: "visible",
      timeout: 30_000
    });

    return (await metricLocator.innerText()).trim();
  }

  private buildUrl(pathSegment: string): string {
    if (this.baseUrl.trim().length === 0) {
      throw new Error("VELES_BASE_URL must be configured before Veles automation can run.");
    }

    return new URL(resolveConfiguredSelector("backtestPath", pathSegment), this.baseUrl).toString();
  }
}
