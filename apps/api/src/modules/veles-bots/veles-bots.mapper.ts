import type { VelesBotSummary } from "@veles/shared";

import type { RawVelesBotDto, RawVelesBotsListResponseDto } from "./veles-bots.types.js";

const NORMALIZED_BOT_STATUSES = new Set([
  "RUNNING",
  "AWAITING_SIGNAL",
  "TERMINATED",
  "AWAITING_TERMINATION",
  "FAILED"
]);

export function mapRawBotToSummary(rawBot: RawVelesBotDto): VelesBotSummary {
  const symbols = Array.isArray(rawBot.symbols)
    ? rawBot.symbols.filter((symbol): symbol is string => typeof symbol === "string" && symbol.trim().length > 0)
    : [];

  const pair = symbols[0] ?? null;
  const status = normalizeBotStatus(rawBot.status, rawBot.substatus);

  return {
    id: String(rawBot.id),
    name: normalizeNullableString(rawBot.name) ?? `Bot ${String(rawBot.id)}`,
    pair,
    symbols,
    exchange: normalizeNullableString(rawBot.exchange),
    direction: normalizeNullableString(rawBot.algorithm),
    status,
    substatus: normalizeNullableString(rawBot.substatus),
    apiKeyId: typeof rawBot.apiKey === "number" && Number.isFinite(rawBot.apiKey) ? rawBot.apiKey : null,
    strategyType: normalizeNullableString(rawBot.settings?.type),
    marginType: normalizeNullableString(rawBot.deposit?.marginType),
    createdAt: normalizeNullableString(rawBot.createdAt),
    updatedAt: normalizeNullableString(rawBot.updatedAt),
    isRunning: status === "RUNNING"
  };
}

export function isRawBotsListResponse(value: unknown): value is RawVelesBotsListResponseDto {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const content = record["content"];

  return content === undefined || Array.isArray(content);
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBotStatus(rawStatus: unknown, rawSubstatus: unknown): string | null {
  const status = normalizeNullableString(rawStatus);
  const substatus = normalizeNullableString(rawSubstatus);

  if (substatus !== null && NORMALIZED_BOT_STATUSES.has(substatus)) {
    return substatus;
  }

  if (status !== null && NORMALIZED_BOT_STATUSES.has(status)) {
    return status;
  }

  return status ?? substatus;
}
