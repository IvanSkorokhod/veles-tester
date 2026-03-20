export interface ApiEnv {
  host: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
}

export function loadApiEnv(): ApiEnv {
  return {
    host: process.env["API_HOST"] ?? "0.0.0.0",
    port: Number.parseInt(process.env["API_PORT"] ?? "3000", 10),
    databaseUrl: process.env["DATABASE_URL"] ?? "",
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379"
  };
}
