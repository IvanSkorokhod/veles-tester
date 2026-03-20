export type JobState = "pending" | "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type ExperimentStatus =
  | "draft"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RunStatus = "pending" | "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type ArtifactType = "screenshot" | "html-snapshot" | "network-log" | "trace" | "raw-payload";

export type ParameterValue = string | number | boolean | null;

export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}
