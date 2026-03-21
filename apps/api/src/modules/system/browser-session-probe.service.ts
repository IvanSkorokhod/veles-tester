import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import type { BrowserSessionProbeResult } from "@veles/shared";

import { findFirstVelesPage } from "./veles-tab.matcher.js";

export class BrowserSessionProbeService {
  private browser?: Browser;
  private browserPromise?: Promise<Browser>;

  public constructor(
    private readonly cdpUrl: string | undefined,
    private readonly expectedHost: string
  ) {}

  public async probe(): Promise<BrowserSessionProbeResult> {
    const checkedAt = new Date().toISOString();

    if (typeof this.cdpUrl !== "string" || this.cdpUrl.length === 0) {
      return {
        state: "CDP_UNAVAILABLE",
        browserConnected: false,
        velesTabFound: false,
        contextCount: 0,
        pageCount: 0,
        checkedAt,
        message:
          "BROWSER_CDP_URL is not configured for the attached browser session probe. Configure a Chromium-based browser CDP endpoint. Microsoft Edge is recommended for local automation."
      };
    }

    let browser: Browser;

    try {
      browser = await this.getOrConnectBrowser();
    } catch (error) {
      return {
        state: "CDP_UNAVAILABLE",
        browserConnected: false,
        velesTabFound: false,
        contextCount: 0,
        pageCount: 0,
        checkedAt,
        message:
          `Unable to connect to the attached browser session at ${this.cdpUrl}. ` +
          `Verify that a Chromium-based browser is running with remote debugging enabled. ` +
          `Microsoft Edge is recommended for local automation. ${formatProbeErrorMessage(error)}`
      };
    }

    const contexts = browser.contexts();
    const pages = contexts.flatMap((context) => context.pages());
    const velesPage = findFirstVelesPage(pages, this.expectedHost);

    if (velesPage === undefined) {
      return {
        state: pages.length === 0 ? "BROWSER_CONNECTED" : "VELES_TAB_NOT_FOUND",
        browserConnected: true,
        velesTabFound: false,
        contextCount: contexts.length,
        pageCount: pages.length,
        checkedAt,
        message:
          pages.length === 0
            ? "Connected to the attached Chromium-based browser session, but no open pages were detected."
            : `Connected to the attached Chromium-based browser session, but no open tab with "${this.expectedHost}" in its URL was found. Open Veles in the dedicated automation browser. Microsoft Edge is recommended for local automation.`
      };
    }

    const velesTabUrl = velesPage.url();
    const velesTabTitle = await readPageTitle(velesPage);

    if (velesTabTitle === undefined) {
      return {
        state: "VELES_TAB_FOUND",
        browserConnected: true,
        velesTabFound: true,
        velesTabUrl,
        contextCount: contexts.length,
        pageCount: pages.length,
        checkedAt,
        message: "A Veles tab was detected in the attached browser session by URL, but its title could not be read safely."
      };
    }

    return {
      state: "VELES_TAB_ACCESSIBLE",
      browserConnected: true,
      velesTabFound: true,
      velesTabUrl,
      velesTabTitle,
      contextCount: contexts.length,
      pageCount: pages.length,
      checkedAt,
      message: "A Veles tab is open in the attached browser session and its title is readable."
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
        throw error;
      });

    return this.browserPromise;
  }
}

async function readPageTitle(page: Page): Promise<string | undefined> {
  try {
    const title = (await page.title()).trim();
    return title.length > 0 ? title : "Untitled Veles tab";
  } catch {
    return undefined;
  }
}

function formatProbeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown CDP connection error.";
  }

  const sanitizedMessage = stripAnsi(error.message)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (sanitizedMessage === undefined) {
    return "Unknown CDP connection error.";
  }

  return sanitizedMessage.replace(/^browserType\.connectOverCDP:\s*/, "");
}

function stripAnsi(value: string): string {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}
