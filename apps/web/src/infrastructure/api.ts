const DEFAULT_API_BASE_URL = "http://localhost:3000";

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env["VITE_API_BASE_URL"]?.trim();
  return configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : DEFAULT_API_BASE_URL;
}

export function buildApiUrl(path: string): string {
  return new URL(path, withTrailingSlash(resolveApiBaseUrl())).toString();
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}
