import type { ParameterDefinition, ParameterValue } from "../domain/index.js";
import type { FixedBacktestRawMetrics } from "../domain/fixed-backtest.js";

export interface AutomationSessionContext {
  sessionId: string;
  preferredPageUrl?: string | null;
}

export interface DiscoveryControlCandidate {
  label?: string;
  role?: string;
  elementTag: string;
  attributes: Record<string, string>;
  selectorHints: ParameterDefinition["selector"][];
}

export interface DiscoveryDraft {
  workflowKey: string;
  controls: DiscoveryControlCandidate[];
}

export interface CapturedArtifactRef {
  artifactType: "screenshot" | "html-snapshot" | "network-log" | "trace" | "raw-payload" | "metrics-json";
  storageRef: string;
  mimeType: string;
  stepName?: string;
}

export interface VelesBrowserAdapter<TBrowserSession = unknown, TAuthenticatedContext = unknown, TBacktestPage = unknown> {
  connectToBrowserSession(session: AutomationSessionContext): Promise<TBrowserSession>;
  resolveAuthenticatedContext(
    browserSession: TBrowserSession,
    session: AutomationSessionContext
  ): Promise<TAuthenticatedContext>;
  openBacktestPage(authenticatedContext: TAuthenticatedContext): Promise<TBacktestPage>;
  applyParameterValues(
    backtestPage: TBacktestPage,
    parameterValues: Record<string, ParameterValue>
  ): Promise<void>;
  runBacktest(backtestPage: TBacktestPage): Promise<void>;
  waitForBacktestCompletion(backtestPage: TBacktestPage): Promise<void>;
  readMetrics(backtestPage: TBacktestPage): Promise<FixedBacktestRawMetrics>;
  captureArtifacts(
    backtestPage: TBacktestPage,
    runId: string,
    stepName: string,
    options?: {
      screenshot?: boolean;
      html?: boolean;
    }
  ): Promise<CapturedArtifactRef[]>;
  discoverTemplateDraft(session: AutomationSessionContext, workflowKey: string): Promise<DiscoveryDraft>;
}
