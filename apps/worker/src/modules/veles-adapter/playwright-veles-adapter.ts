import type {
  AutomationSessionContext,
  BacktestExecutionRequest,
  BacktestExecutionResponse,
  DiscoveryDraft,
  VelesBrowserAdapter
} from "@veles/shared";

export class PlaywrightVelesAdapter implements VelesBrowserAdapter {
  public constructor(private readonly headless: boolean) {}

  public async ensureAuthenticatedSession(_session: AutomationSessionContext): Promise<void> {
    void this.headless;

    throw new Error("TODO: implement Veles session bootstrap and validation.");
  }

  public async executeBacktest(_request: BacktestExecutionRequest): Promise<BacktestExecutionResponse> {
    throw new Error("TODO: implement schema-driven Veles backtest execution.");
  }

  public async discoverTemplateDraft(
    _session: AutomationSessionContext,
    _workflowKey: string
  ): Promise<DiscoveryDraft> {
    throw new Error("TODO: implement manual-review-only discovery draft generation.");
  }
}
