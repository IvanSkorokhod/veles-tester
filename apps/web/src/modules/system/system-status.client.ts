import type { ApiHealthStatusResponse, BrowserSessionProbeResult } from "@veles/shared";

import { fetchJson } from "../../infrastructure/api.js";

export interface DashboardSystemStatusSnapshot {
  apiHealth?: ApiHealthStatusResponse;
  browserSession?: BrowserSessionProbeResult;
  checkedAt: string;
}

export async function loadDashboardSystemStatus(): Promise<DashboardSystemStatusSnapshot> {
  const [apiHealthResult, browserSessionResult] = await Promise.allSettled([
    fetchJson<ApiHealthStatusResponse>("/health"),
    fetchJson<BrowserSessionProbeResult>("/system/browser-session")
  ]);

  const apiHealth = apiHealthResult.status === "fulfilled" ? apiHealthResult.value : undefined;
  const browserSession = browserSessionResult.status === "fulfilled" ? browserSessionResult.value : undefined;

  return {
    apiHealth,
    browserSession,
    checkedAt: browserSession?.checkedAt ?? apiHealth?.checkedAt ?? new Date().toISOString()
  };
}
