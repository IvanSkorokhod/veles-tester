import type {
  AutomationSessionContext,
  BacktestExecutionRequest,
  BacktestExecutionResponse,
  CapturedArtifactRef,
  DiscoveryDraft,
  FixedBacktestParameterKey,
  FixedBacktestRawMetrics,
  ParameterValue,
  VelesBrowserAdapter
} from "@veles/shared";

import type { Page } from "playwright";

import type { FilesystemArtifactStore } from "../artifacts/filesystem-artifact-store.js";

import { VelesBacktestPage } from "./pages/backtest-page.js";
import { VelesLoginPage } from "./pages/login-page.js";
import { VelesSessionManager } from "./session-manager.js";
import { VelesAutomationError } from "./veles-automation.error.js";
import { velesSelectorRegistry } from "./veles-selector-registry.js";

export interface PlaywrightVelesAdapterConfig {
  baseUrl: string;
  login: string;
  password: string;
  headless: boolean;
  sessionStatePath: string;
  artifactStore: FilesystemArtifactStore;
}

export class PlaywrightVelesAdapter implements VelesBrowserAdapter {
  private readonly sessionManager: VelesSessionManager;

  public constructor(private readonly config: PlaywrightVelesAdapterConfig) {
    this.sessionManager = new VelesSessionManager(config.headless, config.sessionStatePath);
  }

  public async ensureAuthenticatedSession(session: AutomationSessionContext): Promise<void> {
    await this.ensureLoggedIn(session);
  }

  public async ensureLoggedIn(session: AutomationSessionContext): Promise<void> {
    this.assertRuntimeConfiguration();

    await this.sessionManager.withPage(session, async ({ context, page }) => {
      const loginPage = new VelesLoginPage(page, this.config.baseUrl, velesSelectorRegistry.fixedBacktest.login);

      await loginPage.open();

      if (!(await loginPage.isLoggedIn())) {
        await loginPage.login(this.config.login, this.config.password);
      }

      await this.sessionManager.persistStorageState(context, session);
    });
  }

  public async executeBacktest(request: BacktestExecutionRequest): Promise<BacktestExecutionResponse> {
    this.assertRuntimeConfiguration();

    return this.sessionManager.withPage(request.session, async ({ context, page }) => {
      const loginPage = new VelesLoginPage(page, this.config.baseUrl, velesSelectorRegistry.fixedBacktest.login);
      const backtestPage = new VelesBacktestPage(page, this.config.baseUrl, velesSelectorRegistry.fixedBacktest.backtest);
      const artifacts: CapturedArtifactRef[] = [];

      try {
        await this.ensureLoggedInOnPage(loginPage);
        await this.openBacktestPage(backtestPage);
        artifacts.push(...(await this.captureArtifacts(page, request.runId, "before-run", { screenshot: true })));
        await this.applyParameterValues(backtestPage, request.parameterValues);
        await this.runBacktest(backtestPage);
        await this.waitForBacktestCompletion(backtestPage);

        const metrics = await this.readMetrics(backtestPage);

        artifacts.push(
          ...(await this.captureArtifacts(page, request.runId, "after-run", {
            screenshot: true,
            html: true
          }))
        );
        await this.sessionManager.persistStorageState(context, request.session);

        return {
          rawPayload: {
            runId: request.runId,
            workflowKey: request.template.workflowKey,
            templateKey: request.template.templateKey,
            templateVersion: request.template.version,
            pageUrl: page.url(),
            capturedAt: new Date().toISOString(),
            parameterValues: request.parameterValues,
            metrics
          },
          artifacts
        };
      } catch (error) {
        const failureArtifacts = await this.captureFailureArtifacts(page, request.runId);

        throw new VelesAutomationError(
          `Veles backtest execution failed for run ${request.runId}: ${error instanceof Error ? error.message : "Unknown error"}`,
          [...artifacts, ...failureArtifacts],
          error
        );
      }
    });
  }

  public async discoverTemplateDraft(
    _session: AutomationSessionContext,
    _workflowKey: string
  ): Promise<DiscoveryDraft> {
    throw new Error("TODO: implement manual-review-only discovery draft generation.");
  }

  public async openBacktestPage(backtestPage: VelesBacktestPage): Promise<void> {
    await backtestPage.open();
  }

  public async applyParameterValues(
    backtestPage: VelesBacktestPage,
    parameterValues: Record<string, ParameterValue>
  ): Promise<void> {
    for (const parameterKey of backtestPage.getSupportedParameterKeys()) {
      const value = parameterValues[parameterKey];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Parameter \`${parameterKey}\` must be a finite number for the fixed backtest workflow.`);
      }

      await backtestPage.applyNumericParameter(parameterKey as FixedBacktestParameterKey, value);
    }
  }

  public async runBacktest(backtestPage: VelesBacktestPage): Promise<void> {
    await backtestPage.runBacktest();
  }

  public async waitForBacktestCompletion(backtestPage: VelesBacktestPage): Promise<void> {
    await backtestPage.waitForBacktestCompletion();
  }

  public async readMetrics(backtestPage: VelesBacktestPage): Promise<FixedBacktestRawMetrics> {
    return backtestPage.readMetrics();
  }

  public async captureArtifacts(
    page: Page,
    runId: string,
    stepName: string,
    options: {
      screenshot?: boolean;
      html?: boolean;
    } = {}
  ): Promise<CapturedArtifactRef[]> {
    const artifacts: CapturedArtifactRef[] = [];

    if (options.screenshot === true) {
      artifacts.push(await this.config.artifactStore.captureScreenshot(page, runId, stepName));
    }

    if (options.html === true) {
      artifacts.push(await this.config.artifactStore.captureHtml(page, runId, stepName));
    }

    return artifacts;
  }

  private async ensureLoggedInOnPage(loginPage: VelesLoginPage): Promise<void> {
    await loginPage.open();

    if (await loginPage.isLoggedIn()) {
      return;
    }

    if (!(await loginPage.isLoginFormVisible())) {
      throw new Error("The Veles login form was not detected. Capture the correct login selectors first.");
    }

    await loginPage.login(this.config.login, this.config.password);
  }

  private async captureFailureArtifacts(page: Page, runId: string): Promise<CapturedArtifactRef[]> {
    try {
      return this.captureArtifacts(page, runId, "failure", {
        screenshot: true,
        html: true
      });
    } catch {
      return [];
    }
  }

  private assertRuntimeConfiguration(): void {
    const missingKeys = [
      this.config.baseUrl.trim().length === 0 ? "VELES_BASE_URL" : null,
      this.config.login.trim().length === 0 ? "VELES_LOGIN" : null,
      this.config.password.trim().length === 0 ? "VELES_PASSWORD" : null
    ].filter((value): value is string => value !== null);

    if (missingKeys.length > 0) {
      throw new Error(`Missing required Veles runtime env vars: ${missingKeys.join(", ")}.`);
    }
  }
}
