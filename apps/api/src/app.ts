import Fastify, { type FastifyInstance } from "fastify";

import { discoveryRoutes } from "./modules/discovery/discovery.routes.js";
import { experimentRoutes } from "./modules/experiments/experiment.routes.js";
import { healthRoutes } from "./modules/system/health.routes.js";

export function buildApiApp(): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  void app.register(healthRoutes);
  void app.register(experimentRoutes, { prefix: "/api" });
  void app.register(discoveryRoutes, { prefix: "/api" });

  return app;
}
