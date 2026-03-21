import type { FastifyPluginAsync } from "fastify";

import { ApiRouteError, readListRunsQuery, sendRouteError } from "../vertical-slice/vertical-slice.http.js";
import type { VerticalSliceService } from "../vertical-slice/vertical-slice.service.js";

export function buildRunRoutes(service: VerticalSliceService): FastifyPluginAsync {
  return async (app) => {
    app.get("/runs/summary", async (request, reply) => {
      try {
        const query = readListRunsQuery(request.query);
        const summary = await service.summarizeRuns(query);

        return reply.code(200).send(summary);
      } catch (error) {
        return sendRouteError(reply, error);
      }
    });

    app.get("/runs", async (request, reply) => {
      try {
        const query = readListRunsQuery(request.query);
        const runs = await service.listRuns(query);

        return reply.code(200).send(runs);
      } catch (error) {
        return sendRouteError(reply, error);
      }
    });

    app.get("/runs/:runId", async (request, reply) => {
      try {
        const params = request.params as { runId?: unknown };

        if (typeof params.runId !== "string" || params.runId.trim().length === 0) {
          throw new ApiRouteError(400, "`runId` must be a non-empty string.");
        }

        const runDetails = await service.getRunDetails(params.runId);

        return reply.code(200).send(runDetails);
      } catch (error) {
        return sendRouteError(reply, error);
      }
    });
  };
}
