export interface WorkerEnv {
  redisUrl: string;
  databaseUrl: string;
  playwrightHeadless: boolean;
  workerConcurrency: number;
}

export function loadWorkerEnv(): WorkerEnv {
  return {
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
    databaseUrl: process.env["DATABASE_URL"] ?? "",
    playwrightHeadless: (process.env["PLAYWRIGHT_HEADLESS"] ?? "true") !== "false",
    workerConcurrency: Number.parseInt(process.env["WORKER_CONCURRENCY"] ?? "1", 10)
  };
}
