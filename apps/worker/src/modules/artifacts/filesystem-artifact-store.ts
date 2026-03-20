import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { CapturedArtifactRef } from "@veles/shared";
import type { Page } from "playwright";

export class FilesystemArtifactStore {
  public constructor(private readonly rootDir: string) {}

  public async captureScreenshot(page: Page, runId: string, stepName: string): Promise<CapturedArtifactRef> {
    const filePath = await this.buildArtifactPath(runId, stepName, "png");
    await page.screenshot({
      path: filePath,
      fullPage: true
    });

    return {
      artifactType: "screenshot",
      storageRef: filePath,
      mimeType: "image/png",
      stepName
    };
  }

  public async captureHtml(page: Page, runId: string, stepName: string): Promise<CapturedArtifactRef> {
    const filePath = await this.buildArtifactPath(runId, stepName, "html");
    await writeFile(filePath, await page.content(), "utf8");

    return {
      artifactType: "html-snapshot",
      storageRef: filePath,
      mimeType: "text/html",
      stepName
    };
  }

  public async writeJsonArtifact(
    runId: string,
    artifactType: "raw-payload" | "metrics-json",
    stepName: string,
    payload: Record<string, unknown>
  ): Promise<CapturedArtifactRef> {
    const filePath = await this.buildArtifactPath(runId, stepName, "json");

    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    return {
      artifactType,
      storageRef: filePath,
      mimeType: "application/json",
      stepName
    };
  }

  public async deleteArtifact(storageRef: string): Promise<void> {
    try {
      await unlink(storageRef);
    } catch {
      // Ignore — file may already be gone; the goal is cleanup on failure paths.
    }
  }

  public async readJsonArtifact(storageRef: string): Promise<Record<string, unknown>> {
    const rawValue = await readFile(storageRef, "utf8");
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (parsedValue === null || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      throw new Error(`Artifact ${storageRef} does not contain a JSON object.`);
    }

    return parsedValue as Record<string, unknown>;
  }

  private async buildArtifactPath(runId: string, stepName: string, extension: string): Promise<string> {
    const runDirectory = resolve(this.rootDir, "runs", sanitizeSegment(runId));

    if (!runDirectory.startsWith(this.rootDir)) {
      throw new Error(`Artifact path for run "${runId}" escapes the artifact root directory.`);
    }

    await mkdir(runDirectory, {
      recursive: true
    });

    const fileName = `${timestampSegment()}-${sanitizeSegment(stepName)}.${extension}`;
    const filePath = resolve(runDirectory, fileName);

    return filePath;
  }
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function timestampSegment(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
