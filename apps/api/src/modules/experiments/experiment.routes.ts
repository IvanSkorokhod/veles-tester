import type { FastifyPluginAsync } from "fastify";

import { readCreateExperimentBody, sendRouteError } from "../vertical-slice/vertical-slice.http.js";
import type { VerticalSliceService } from "../vertical-slice/vertical-slice.service.js";

export function buildExperimentRoutes(service: VerticalSliceService): FastifyPluginAsync {
  return async (app) => {
    app.post("/experiments", async (request, reply) => {
      try {
        const input = readCreateExperimentBody(request.body);
        const createdExperiment = await service.createExperiment(input);

        return reply.code(201).send(createdExperiment);
      } catch (error) {
        return sendRouteError(reply, error);
      }
    });
  };
}
