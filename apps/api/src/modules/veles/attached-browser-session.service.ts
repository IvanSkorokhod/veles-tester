import type { Browser, Page } from "playwright";
import { chromium } from "playwright";

import { findFirstVelesPage } from "../system/veles-tab.matcher.js";
import { VelesIntegrationError } from "./veles-integration.error.js";

export interface ResolvedVelesPage {
  page: Page;
  sourceOrigin: string;
  pageUrl: string;
  pageTitle: string | null;
  contextCount: number;
  pageCount: number;
}

export class AttachedBrowserSessionService {
  private browser?: Browser;
  private browserPromise?: Promise<Browser>;

  public constructor(
    private readonly cdpUrl: string | undefined,
    private readonly expectedHost: string
  ) {}

  public async requireVelesPage(): Promise<ResolvedVelesPage> {
    if (typeof this.cdpUrl !== "string" || this.cdpUrl.length === 0) {
      throw new VelesIntegrationError(
        "BROWSER_SESSION_UNAVAILABLE",
        "BROWSER_CDP_URL is not configured for live Veles session access.",
        {
          expectedHost: this.expectedHost
        }
      );
    }

    const browser = await this.getOrConnectBrowser();
    const contexts = browser.contexts();
    const pages = contexts.flatMap((context) => context.pages());
    const velesPage = findFirstVelesPage(pages, this.expectedHost);

    if (velesPage === undefined) {
      throw new VelesIntegrationError(
        "VELES_TAB_NOT_FOUND",
        `No attached Veles tab with "${this.expectedHost}" in its URL was found.`,
        {
          cdpUrl: this.cdpUrl,
          expectedHost: this.expectedHost,
          contextCount: contexts.length,
          pageCount: pages.length
        }
      );
    }

    const pageUrl = velesPage.url();

    return {
      page: velesPage,
      sourceOrigin: resolvePageOrigin(pageUrl),
      pageUrl,
      pageTitle: await readPageTitle(velesPage),
      contextCount: contexts.length,
      pageCount: pages.length
    };
  }

  private async getOrConnectBrowser(): Promise<Browser> {
    if (this.browser?.isConnected() === true) {
      return this.browser;
    }

    if (this.browserPromise !== undefined) {
      return this.browserPromise;
    }

    this.browserPromise = chromium
      .connectOverCDP(this.cdpUrl!)
      .then((browser) => {
        this.browser = browser;
        this.browserPromise = undefined;
        browser.on("disconnected", () => {
          this.browser = undefined;
        });

        return browser;
      })
      .catch((error: unknown) => {
        this.browserPromise = undefined;

        throw new VelesIntegrationError(
          "BROWSER_SESSION_UNAVAILABLE",
          `Unable to connect to the attached browser session at ${this.cdpUrl}.`,
          {
            cdpUrl: this.cdpUrl,
            expectedHost: this.expectedHost,
            cause: formatPlaywrightError(error)
          }
        );
      });

    return this.browserPromise;
  }
}

async function readPageTitle(page: Page): Promise<string | null> {
  try {
    const title = (await page.title()).trim();
    return title.length > 0 ? title : null;
  } catch {
    return null;
  }
}

function resolvePageOrigin(pageUrl: string): string {
  try {
    return new URL(pageUrl).origin;
  } catch {
    throw new VelesIntegrationError("REQUEST_FAILED", "Unable to resolve the origin of the attached Veles tab.", {
      pageUrl
    });
  }
}

function formatPlaywrightError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown CDP connection error.";
  }

  const firstLine = error.message
    .replace(/\u001B\[[0-9;]*m/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return (firstLine ?? "Unknown CDP connection error.").replace(/^browserType\.connectOverCDP:\s*/, "");
}
