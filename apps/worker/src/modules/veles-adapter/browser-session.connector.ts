import type { AutomationSessionContext } from "@veles/shared";
import { chromium, type Browser } from "playwright";

export interface ConnectedBrowserSession {
  browser: Browser;
  cdpUrl: string;
  sessionId: string;
}

export class CdpBrowserSessionConnector {
  private browserPromise?: Promise<Browser>;
  private browser?: Browser;

  public constructor(private readonly cdpUrl: string) {}

  public async connect(session: AutomationSessionContext): Promise<ConnectedBrowserSession> {
    const browser = await this.getOrCreateBrowser();

    return {
      browser,
      cdpUrl: this.cdpUrl,
      sessionId: session.sessionId
    };
  }

  private async getOrCreateBrowser(): Promise<Browser> {
    if (this.browser?.isConnected() === true) {
      return this.browser;
    }

    if (this.browserPromise !== undefined) {
      return this.browserPromise;
    }

    this.browserPromise = chromium
      .connectOverCDP(this.cdpUrl)
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

        throw new Error(
          `Failed to connect to the existing browser session at BROWSER_CDP_URL=${this.cdpUrl}. Launch Chrome/Chromium with remote debugging enabled and authenticate to Veles manually first. ${
            error instanceof Error ? error.message : ""
          }`.trim()
        );
      });

    return this.browserPromise;
  }
}
