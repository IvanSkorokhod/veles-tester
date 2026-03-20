import { buildApiApp } from "./app.js";
import { loadApiEnv } from "./infrastructure/env.js";

const env = loadApiEnv();
const app = buildApiApp();

try {
  await app.listen({
    host: env.host,
    port: env.port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
