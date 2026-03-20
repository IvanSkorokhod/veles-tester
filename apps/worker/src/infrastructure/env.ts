import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadDotEnv } from "dotenv";

export interface WorkerEnv {
  redisUrl: string;
  databaseUrl: string;
  velesBaseUrl: string;
  velesBacktestUrl?: string;
  browserCdpUrl: string;
  playwrightHeadless: boolean;
  workerConcurrency: number;
  backtestConcurrency: number;
  artifactsDir: string;
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

export function loadWorkerEnv(): WorkerEnv {
  loadWorkspaceEnv();

  const databaseUrl = process.env["DATABASE_URL"] ?? "";
  const velesBaseUrl = process.env["VELES_BASE_URL"] ?? "";
  const browserCdpUrl = process.env["BROWSER_CDP_URL"] ?? "";

  const missingVars: string[] = [];
  if (databaseUrl.trim().length === 0) missingVars.push("DATABASE_URL");
  if (velesBaseUrl.trim().length === 0) missingVars.push("VELES_BASE_URL");
  if (browserCdpUrl.trim().length === 0) missingVars.push("BROWSER_CDP_URL");

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }

  return {
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
    databaseUrl,
    velesBaseUrl,
    velesBacktestUrl: process.env["VELES_BACKTEST_URL"]?.trim() || undefined,
    browserCdpUrl,
    playwrightHeadless: (process.env["PLAYWRIGHT_HEADLESS"] ?? "false") === "true",
    workerConcurrency: Number.parseInt(process.env["WORKER_CONCURRENCY"] ?? "2", 10),
    backtestConcurrency: Number.parseInt(process.env["BACKTEST_CONCURRENCY"] ?? "1", 10),
    artifactsDir: process.env["ARTIFACTS_DIR"] ?? resolve(process.cwd(), "../../artifacts")
  };
}
