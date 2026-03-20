import Fastify, { type FastifyInstance } from "fastify";

import { loadApiEnv } from "./infrastructure/env.js";
import { prisma } from "./infrastructure/prisma.js";
import { closeApiQueues, createApiQueues } from "./infrastructure/queues.js";
import { discoveryRoutes } from "./modules/discovery/discovery.routes.js";
import { buildExperimentRoutes } from "./modules/experiments/experiment.routes.js";
import { ExperimentOrchestratorService } from "./modules/orchestrator/orchestrator.service.js";
import { buildParameterSpaceRoutes } from "./modules/parameter-spaces/parameter-space.routes.js";
import { buildRunRoutes } from "./modules/runs/run.routes.js";
import { buildStrategyTemplateRoutes } from "./modules/strategy-templates/strategy-template.routes.js";
import { healthRoutes } from "./modules/system/health.routes.js";
import { VerticalSliceService } from "./modules/vertical-slice/vertical-slice.service.js";

export function buildApiApp(): FastifyInstance {
  const env = loadApiEnv();
  const queues = createApiQueues(env.redisUrl);
  const orchestrator = new ExperimentOrchestratorService(queues);
  const verticalSliceService = new VerticalSliceService(prisma, orchestrator);
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

  app.addHook("onClose", async () => {
    await closeApiQueues(queues);
    await prisma.$disconnect();
  });

  void app.register(healthRoutes);
  void app.register(buildStrategyTemplateRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(buildParameterSpaceRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(buildExperimentRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(buildRunRoutes(verticalSliceService), { prefix: "/api" });
  void app.register(discoveryRoutes, { prefix: "/api" });

  return app;
}
