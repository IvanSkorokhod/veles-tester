import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadDotEnv } from "dotenv";

export interface WorkerEnv {
  redisUrl: string;
  databaseUrl: string;
  velesBaseUrl: string;
  velesLogin: string;
  velesPassword: string;
  playwrightHeadless: boolean;
  workerConcurrency: number;
  velesSessionStatePath: string;
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
  const velesLogin = process.env["VELES_LOGIN"] ?? "";
  const velesPassword = process.env["VELES_PASSWORD"] ?? "";

  const missingVars: string[] = [];
  if (databaseUrl.trim().length === 0) missingVars.push("DATABASE_URL");
  if (velesBaseUrl.trim().length === 0) missingVars.push("VELES_BASE_URL");
  if (velesLogin.trim().length === 0) missingVars.push("VELES_LOGIN");
  if (velesPassword.trim().length === 0) missingVars.push("VELES_PASSWORD");

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }

  return {
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
    databaseUrl,
    velesBaseUrl,
    velesLogin,
    velesPassword,
    playwrightHeadless: (process.env["PLAYWRIGHT_HEADLESS"] ?? "true") !== "false",
    workerConcurrency: Number.parseInt(process.env["WORKER_CONCURRENCY"] ?? "1", 10),
    velesSessionStatePath:
      process.env["VELES_SESSION_STATE_PATH"] ?? resolve(process.cwd(), "../../artifacts/session/veles-storage-state.json"),
    artifactsDir: process.env["ARTIFACTS_DIR"] ?? resolve(process.cwd(), "../../artifacts")
  };
}
