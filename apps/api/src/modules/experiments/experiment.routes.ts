import type { FastifyPluginAsync } from "fastify";

export const experimentRoutes: FastifyPluginAsync = async (app) => {
  app.post("/experiments", async (_request, reply) => {
    return reply.code(501).send({
      message: "TODO: persist experiment definitions and enqueue experiment.create."
    });
  });
};
