export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
}

export function redisConnectionOptionsFromUrl(redisUrl: string): RedisConnectionOptions {
  const parsed = new URL(redisUrl);
  const dbSegment = parsed.pathname.replace("/", "");

  return {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || "6379", 10),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: dbSegment ? Number.parseInt(dbSegment, 10) : 0
  };
}
