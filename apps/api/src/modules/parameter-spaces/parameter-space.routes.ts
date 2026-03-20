import type { FastifyPluginAsync } from "fastify";

import { readCreateParameterSpaceBody, sendRouteError } from "../vertical-slice/vertical-slice.http.js";
import type { VerticalSliceService } from "../vertical-slice/vertical-slice.service.js";

export function buildParameterSpaceRoutes(service: VerticalSliceService): FastifyPluginAsync {
  return async (app) => {
    app.post("/parameter-spaces", async (request, reply) => {
      try {
        const input = readCreateParameterSpaceBody(request.body);
        const createdParameterSpace = await service.createParameterSpace(input);

        return reply.code(201).send(createdParameterSpace);
      } catch (error) {
        return sendRouteError(reply, error);
      }
    });
  };
}
