import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { loadApiEnv } from "./infrastructure/env.js";
import { prisma } from "./infrastructure/prisma.js";
import { closeApiQueues, createApiQueues } from "./infrastructure/queues.js";
import { discoveryRoutes } from "./modules/discovery/discovery.routes.js";
import { buildExperimentRoutes } from "./modules/experiments/experiment.routes.js";
import { BrowserSessionProbeService } from "./modules/system/browser-session-probe.service.js";
import { ExperimentOrchestratorService } from "./modules/orchestrator/orchestrator.service.js";
import { buildParameterSpaceRoutes } from "./modules/parameter-spaces/parameter-space.routes.js";
import { buildRunRoutes } from "./modules/runs/run.routes.js";
import { buildStrategyTemplateRoutes } from "./modules/strategy-templates/strategy-template.routes.js";
import { buildSystemRoutes } from "./modules/system/system.routes.js";
import { VerticalSliceService } from "./modules/vertical-slice/vertical-slice.service.js";

export function buildApiApp(): FastifyInstance {
  const env = loadApiEnv();
  const queues = createApiQueues(env.redisUrl);
  const orchestrator = new ExperimentOrchestratorService(queues);
  const verticalSliceService = new VerticalSliceService(prisma, orchestrator);
  const browserSessionProbeService = new BrowserSessionProbeService(env.browserCdpUrl, env.velesExpectedHost);
  const isDev = process.env["NODE_ENV"] !== "production";
  const app = Fastify({
    logger: isDev
      ? {
          level: "info",
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" }
          }
        }
      : { level: "info" }
  });

  // In production this API is accessed from the same host, so CORS is disabled.
  // If a cross-origin production dashboard is introduced, explicit allowed origins must be configured here.
  void app.register(cors, {
    origin: isDev
  });

  app.addHook("onClose", async () => {
    await closeApiQueues(queues);
    await prisma.$disconnect();
  });

  void app.register(buildSystemRoutes(browserSessionProbeService));
  void app.register(buildStrategyTemplateRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(buildParameterSpaceRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(buildExperimentRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(buildRunRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(discoveryRoutes, { prefix: "/api" });

  return app;
}
