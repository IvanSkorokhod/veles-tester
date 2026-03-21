import { buildApiApp } from "./app.js";
import { isHealthyExistingApiInstance } from "./infrastructure/existing-api-instance.js";
import { loadApiEnv } from "./infrastructure/env.js";

const env = loadApiEnv();
const app = buildApiApp();

try {
  await app.listen({
    host: env.host,
    port: env.port
  });
} catch (error) {
  if (isDevPortReuseCase(error) && (await isHealthyExistingApiInstance(env.host, env.port))) {
    app.log.info(
      {
        host: env.host,
        port: env.port
      },
      "A healthy API instance is already running on the configured port; skipping duplicate startup in development."
    );

    await app.close().catch(() => undefined);
    process.exit(0);
  }

  app.log.error(error);
  process.exit(1);
}

function isDevPortReuseCase(error: unknown): error is NodeJS.ErrnoException {
  return process.env["NODE_ENV"] !== "production" && isErrnoException(error) && error.code === "EADDRINUSE";
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
