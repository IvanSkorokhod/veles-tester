import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadDotEnv } from "dotenv";

export interface ApiEnv {
  host: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  browserCdpUrl?: string;
}

let hasLoadedEnv = false;

function loadWorkspaceEnv(): void {
  if (hasLoadedEnv) {
    return;
  }

  for (const candidatePath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (existsSync(candidatePath)) {
      loadDotEnv({
        path: candidatePath
      });
      break;
    }
  }

  hasLoadedEnv = true;
}

export function loadApiEnv(): ApiEnv {
  loadWorkspaceEnv();

  const databaseUrl = process.env["DATABASE_URL"] ?? "";

  if (databaseUrl.trim().length === 0) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return {
    host: process.env["API_HOST"] ?? "0.0.0.0",
    port: Number.parseInt(process.env["API_PORT"] ?? "3000", 10),
    databaseUrl,
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
    browserCdpUrl: process.env["BROWSER_CDP_URL"]?.trim() || undefined
  };
}
