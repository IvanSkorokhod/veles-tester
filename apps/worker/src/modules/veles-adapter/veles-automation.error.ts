import type { CapturedArtifactRef } from "@veles/shared";

export class VelesAutomationError extends Error {
  public constructor(
    message: string,
    public readonly artifacts: CapturedArtifactRef[] = [],
    public readonly causeValue?: unknown
  ) {
    super(message);
    this.name = "VelesAutomationError";
  }
}
