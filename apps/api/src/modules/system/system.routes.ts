import type { ApiHealthStatusResponse, BrowserSessionProbeResult } from "@veles/shared";
import type { FastifyPluginAsync } from "fastify";

import type { BrowserSessionProbeService } from "./browser-session-probe.service.js";

export function buildSystemRoutes(browserSessionProbeService: BrowserSessionProbeService): FastifyPluginAsync {
  return async (app) => {
    app.get("/health", async (): Promise<ApiHealthStatusResponse> => ({
      service: "api",
      status: "ok",
      checkedAt: new Date().toISOString()
    }));

    app.get("/system/browser-session", async (): Promise<BrowserSessionProbeResult> => {
      return browserSessionProbeService.probe();
    });
  };
}
