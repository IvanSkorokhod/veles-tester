import type { VelesDiagnosticErrorResponse } from "@veles/shared";
import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { VelesIntegrationError } from "../veles/veles-integration.error.js";
import type { VelesBotsService } from "./veles-bots.service.js";

export function buildVelesBotsRoutes(service: VelesBotsService): FastifyPluginAsync {
  return async (app) => {
    app.get("/veles/bots", async (_request, reply) => {
      try {
        const bots = await service.listBots();
        return reply.code(200).send(bots);
      } catch (error) {
        return sendVelesRouteError(reply, error);
      }
    });
  };
}

function sendVelesRouteError(reply: FastifyReply, error: unknown): FastifyReply {
  if (!(error instanceof VelesIntegrationError)) {
    reply.log.error(error);
    return reply.code(500).send({
      code: "REQUEST_FAILED",
      message: "Internal server error.",
      checkedAt: new Date().toISOString()
    } satisfies VelesDiagnosticErrorResponse);
  }

  return reply.code(resolveStatusCode(error.code)).send({
    code: error.code,
    message: error.message,
    checkedAt: error.checkedAt,
    details: error.details
  } satisfies VelesDiagnosticErrorResponse);
}

function resolveStatusCode(code: VelesIntegrationError["code"]): number {
  switch (code) {
    case "BROWSER_SESSION_UNAVAILABLE":
    case "VELES_TAB_NOT_FOUND":
      return 503;
    case "SESSION_UNAUTHORIZED":
      return 401;
    case "REQUEST_FAILED":
    case "PARSING_FAILED":
      return 502;
    default:
      return exhaustiveGuard(code);
  }
}

function exhaustiveGuard(value: never): never {
  throw new Error(`Unhandled Veles integration error code: ${String(value)}`);
}
