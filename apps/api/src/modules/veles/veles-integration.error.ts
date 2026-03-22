import type { VelesBotsErrorCode } from "@veles/shared";

export class VelesIntegrationError extends Error {
  public readonly checkedAt: string;

  public constructor(
    public readonly code: VelesBotsErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    checkedAt: string = new Date().toISOString()
  ) {
    super(message);
    this.name = "VelesIntegrationError";
    this.checkedAt = checkedAt;
  }
}
