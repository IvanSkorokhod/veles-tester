import type { TimestampedEntity } from "./common.js";

export type SessionStatus = "active" | "expired" | "invalid" | "unknown";

export interface UserAccountSession extends TimestampedEntity {
  id: string;
  accountLabel: string;
  sessionStateRef: string | null;
  status: SessionStatus;
  lastValidatedAt: string | null;
  expiresAt: string | null;
}
