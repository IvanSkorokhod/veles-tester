import type { FastifyPluginAsync } from "fastify";

export const discoveryRoutes: FastifyPluginAsync = async (app) => {
  app.post("/discovery/drafts", async (_request, reply) => {
    return reply.code(501).send({
      message: "TODO: enqueue reviewed discovery jobs through the worker-owned discovery module."
    });
  });
};
