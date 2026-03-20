import type {
  AutomationSessionContext,
  CapturedArtifactRef,
  DiscoveryDraft,
  FixedBacktestParameterKey,
  FixedBacktestRawMetrics,
  ParameterValue,
  VelesBrowserAdapter
} from "@veles/shared";

import type { FilesystemArtifactStore } from "../artifacts/filesystem-artifact-store.js";

import { AuthenticatedContextResolver, type ResolvedAuthenticatedContext } from "./authenticated-context.resolver.js";
import { CdpBrowserSessionConnector, type ConnectedBrowserSession } from "./browser-session.connector.js";
import { VelesBacktestPage } from "./pages/backtest-page.js";
import { velesSelectorRegistry } from "./veles-selector-registry.js";

export interface PlaywrightVelesAdapterConfig {
  baseUrl: string;
  backtestUrl?: string;
  cdpUrl: string;
  artifactStore: FilesystemArtifactStore;
}

export class PlaywrightVelesAdapter
  implements VelesBrowserAdapter<ConnectedBrowserSession, ResolvedAuthenticatedContext, VelesBacktestPage>
{
  private readonly browserSessionConnector: CdpBrowserSessionConnector;
  private readonly authenticatedContextResolver: AuthenticatedContextResolver;

  public constructor(private readonly config: PlaywrightVelesAdapterConfig) {
    this.assertRuntimeConfiguration();
    this.browserSessionConnector = new CdpBrowserSessionConnector(config.cdpUrl);
    this.authenticatedContextResolver = new AuthenticatedContextResolver(config.baseUrl, config.backtestUrl);
  }

  public async connectToBrowserSession(session: AutomationSessionContext): Promise<ConnectedBrowserSession> {
    return this.browserSessionConnector.connect(session);
  }

  public async resolveAuthenticatedContext(
    browserSession: ConnectedBrowserSession,
    session: AutomationSessionContext
  ): Promise<ResolvedAuthenticatedContext> {
    return this.authenticatedContextResolver.resolve(browserSession, session);
  }

  public async openBacktestPage(authenticatedContext: ResolvedAuthenticatedContext): Promise<VelesBacktestPage> {
    const backtestPage = new VelesBacktestPage(authenticatedContext.page, velesSelectorRegistry.fixedBacktest.backtest);
    const targetUrl = this.resolveBacktestUrl(backtestPage);

    try {
      await backtestPage.open(targetUrl);
      await backtestPage.waitUntilReady();

      return backtestPage;
    } catch (error) {
      throw new Error(
        `Unable to access the authenticated Veles backtest page at ${targetUrl}. Open Veles manually in the browser attached through BROWSER_CDP_URL and confirm the page-ready selector is correct. Current page URL: ${authenticatedContext.page.url()}. ${
          error instanceof Error ? error.message : ""
        }`.trim()
      );
    }
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
    backtestPage: VelesBacktestPage,
    runId: string,
    stepName: string,
    options: {
      screenshot?: boolean;
      html?: boolean;
    } = {}
  ): Promise<CapturedArtifactRef[]> {
    const artifacts: CapturedArtifactRef[] = [];

    if (options.screenshot === true) {
      artifacts.push(await this.config.artifactStore.captureScreenshot(backtestPage.page, runId, stepName));
    }

    if (options.html === true) {
      artifacts.push(await this.config.artifactStore.captureHtml(backtestPage.page, runId, stepName));
    }

    return artifacts;
  }

  public async discoverTemplateDraft(
    _session: AutomationSessionContext,
    _workflowKey: string
  ): Promise<DiscoveryDraft> {
    throw new Error("Discovery draft generation is not yet implemented. Use the Veles UI to inspect selectors manually.");
  }

  private resolveBacktestUrl(backtestPage: VelesBacktestPage): string {
    if (typeof this.config.backtestUrl === "string" && this.config.backtestUrl.trim().length > 0) {
      return this.config.backtestUrl;
    }

    const configuredPath = backtestPage.resolveConfiguredBacktestPath();

    if (configuredPath === undefined) {
      throw new Error(
        "No VELES_BACKTEST_URL was configured and no fallback backtestPath exists in veles-selector-registry.ts."
      );
    }

    return new URL(configuredPath, this.config.baseUrl).toString();
  }

  private assertRuntimeConfiguration(): void {
    const missingKeys = [
      this.config.baseUrl.trim().length === 0 ? "VELES_BASE_URL" : null,
      this.config.cdpUrl.trim().length === 0 ? "BROWSER_CDP_URL" : null
    ].filter((value): value is string => value !== null);

    if (missingKeys.length > 0) {
      throw new Error(`Missing required Veles runtime env vars: ${missingKeys.join(", ")}.`);
    }
  }
}
