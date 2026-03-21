import type { ApiHealthStatusResponse } from "@veles/shared";

export async function isHealthyExistingApiInstance(host: string, port: number): Promise<boolean> {
  for (const origin of buildCandidateOrigins(host, port)) {
    try {
      const response = await fetch(`${origin}/health`, {
        signal: AbortSignal.timeout(1_000),
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as Partial<ApiHealthStatusResponse>;

      if (payload.service === "api" && payload.status === "ok") {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

function buildCandidateOrigins(host: string, port: number): string[] {
  if (host === "0.0.0.0" || host === "::") {
    return [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  }

  return [`http://${host}:${port}`];
}
