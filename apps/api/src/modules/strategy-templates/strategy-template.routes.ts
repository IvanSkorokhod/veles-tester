import type { FastifyPluginAsync } from "fastify";

import { readCreateStrategyTemplateBody, sendRouteError } from "../vertical-slice/vertical-slice.http.js";
import type { VerticalSliceService } from "../vertical-slice/vertical-slice.service.js";

export function buildStrategyTemplateRoutes(service: VerticalSliceService): FastifyPluginAsync {
  return async (app) => {
    app.post("/strategy-templates", async (request, reply) => {
      try {
        const input = readCreateStrategyTemplateBody(request.body);
        const createdTemplate = await service.createStrategyTemplate(input);

        return reply.code(201).send(createdTemplate);
      } catch (error) {
        return sendRouteError(reply, error);
      }
    });
  };
}
