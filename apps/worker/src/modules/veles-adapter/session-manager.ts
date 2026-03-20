import { access, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type { AutomationSessionContext } from "@veles/shared";
import { chromium, type BrowserContext, type Page } from "playwright";

export interface BrowserRunContext {
  context: BrowserContext;
  page: Page;
}

export class VelesSessionManager {
  public constructor(
    private readonly headless: boolean,
    private readonly defaultStorageStatePath: string
  ) {}

  public async withPage<T>(
    session: AutomationSessionContext,
    callback: (runContext: BrowserRunContext) => Promise<T>
  ): Promise<T> {
    const storageStatePath = await this.resolveExistingStorageStatePath(session);
    const browser = await chromium.launch({
      headless: this.headless
    });
    const context = await browser.newContext(
      storageStatePath
        ? {
            storageState: storageStatePath
          }
        : undefined
    );
    const page = await context.newPage();

    try {
      return await callback({
        context,
        page
      });
    } finally {
      await context.close();
      await browser.close();
    }
  }

  public async persistStorageState(
    context: BrowserContext,
    session: AutomationSessionContext
  ): Promise<string> {
    const storageStatePath = this.getStorageStatePath(session);

    await mkdir(dirname(storageStatePath), {
      recursive: true
    });

    await context.storageState({
      path: storageStatePath
    });

    return storageStatePath;
  }

  private async resolveExistingStorageStatePath(session: AutomationSessionContext): Promise<string | undefined> {
    const storageStatePath = this.getStorageStatePath(session);

    try {
      await access(storageStatePath);

      return storageStatePath;
    } catch {
      return undefined;
    }
  }

  private getStorageStatePath(session: AutomationSessionContext): string {
    return session.storageStateRef ?? this.defaultStorageStatePath;
  }
}
