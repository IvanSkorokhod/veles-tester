import type { FixedBacktestParameterValues } from "@veles/shared";
import { FIXED_BACKTEST_PARAMETER_DEFINITIONS } from "@veles/shared";
import type { FastifyReply } from "fastify";

export class ApiRouteError extends Error {
  public constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiRouteError";
  }
}

export interface CreateStrategyTemplateInput {
  templateKey: string;
  version: string;
  displayName: string;
}

export interface CreateParameterSpaceInput {
  strategyTemplateId: string;
  values: FixedBacktestParameterValues;
}

export interface CreateExperimentInput {
  name: string;
  strategyTemplateId: string;
  parameterSpaceId: string;
}

export interface ListRunsQuery {
  experimentId?: string;
}

export function readCreateStrategyTemplateBody(body: unknown): CreateStrategyTemplateInput {
  const record = readObject(body, "request body");

  return {
    templateKey: readRequiredString(record, "templateKey"),
    version: readRequiredString(record, "version"),
    displayName: readRequiredString(record, "displayName")
  };
}

export function readCreateParameterSpaceBody(body: unknown): CreateParameterSpaceInput {
  const record = readObject(body, "request body");

  return {
    strategyTemplateId: readRequiredString(record, "strategyTemplateId"),
    values: readFixedBacktestValues(record["values"])
  };
}

export function readCreateExperimentBody(body: unknown): CreateExperimentInput {
  const record = readObject(body, "request body");

  return {
    name: readRequiredString(record, "name"),
    strategyTemplateId: readRequiredString(record, "strategyTemplateId"),
    parameterSpaceId: readRequiredString(record, "parameterSpaceId")
  };
}

export function readListRunsQuery(query: unknown): ListRunsQuery {
  const record = readObject(query ?? {}, "querystring");
  const experimentId = record["experimentId"];

  if (experimentId === undefined) {
    return {};
  }

  if (typeof experimentId !== "string" || experimentId.trim().length === 0) {
    throw new ApiRouteError(400, "`experimentId` must be a non-empty string when provided.");
  }

  return {
    experimentId: experimentId.trim()
  };
}

export function sendRouteError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof ApiRouteError) {
    return reply.code(error.statusCode).send({
      message: error.message
    });
  }

  reply.log.error(error);

  return reply.code(500).send({
    message: "Internal server error."
  });
}

export function validateFixedBacktestValues(values: unknown): FixedBacktestParameterValues {
  return readFixedBacktestValues(values);
}

function readFixedBacktestValues(value: unknown): FixedBacktestParameterValues {
  const record = readObject(value, "`values`");
  const definitionsByKey = new Map(FIXED_BACKTEST_PARAMETER_DEFINITIONS.map((definition) => [definition.key, definition]));

  const takeProfit = readRequiredNumber(record, "take_profit_percent");
  const stopLoss = readRequiredNumber(record, "stop_loss_percent");

  for (const [key, numericValue] of Object.entries({
    take_profit_percent: takeProfit,
    stop_loss_percent: stopLoss
  })) {
    const definition = definitionsByKey.get(key);
    const minimum = definition?.range?.min ?? Number.NEGATIVE_INFINITY;
    const maximum = definition?.range?.max ?? Number.POSITIVE_INFINITY;

    if (numericValue < minimum || numericValue > maximum) {
      throw new ApiRouteError(
        400,
        `\`${key}\` must be between ${minimum} and ${maximum} for the fixed backtest workflow.`
      );
    }
  }

  return {
    take_profit_percent: takeProfit,
    stop_loss_percent: stopLoss
  };
}

function readObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiRouteError(400, `${fieldName} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiRouteError(400, `\`${key}\` must be a non-empty string.`);
  }

  return value.trim();
}

function readRequiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiRouteError(400, `\`${key}\` must be a finite number.`);
  }

  return value;
}
