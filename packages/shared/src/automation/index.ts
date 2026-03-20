import type { ParameterDefinition, ParameterValue, StrategyTemplate } from "../domain/index.js";

export interface AutomationSessionContext {
  sessionId: string;
  storageStateRef?: string | null;
}

export interface BacktestExecutionRequest {
  runId: string;
  template: StrategyTemplate;
  parameterValues: Record<string, ParameterValue>;
  session: AutomationSessionContext;
}

export interface CapturedArtifactRef {
  artifactType: "screenshot" | "html-snapshot" | "network-log" | "trace" | "raw-payload";
  storageRef: string;
  stepName?: string;
}

export interface BacktestExecutionResponse {
  rawPayload: Record<string, unknown>;
  artifacts: CapturedArtifactRef[];
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

export interface VelesBrowserAdapter {
  ensureAuthenticatedSession(session: AutomationSessionContext): Promise<void>;
  executeBacktest(request: BacktestExecutionRequest): Promise<BacktestExecutionResponse>;
  discoverTemplateDraft(session: AutomationSessionContext, workflowKey: string): Promise<DiscoveryDraft>;
}
