import type { AutomationSessionContext } from "@veles/shared";
import type { BrowserContext, Page } from "playwright";

import type { ConnectedBrowserSession } from "./browser-session.connector.js";

export interface ResolvedAuthenticatedContext {
  context: BrowserContext;
  page: Page;
  createdPage: boolean;
}

export class AuthenticatedContextResolver {
  public constructor(
    private readonly baseUrl: string,
    private readonly backtestUrl?: string
  ) {}

  public async resolve(
    browserSession: ConnectedBrowserSession,
    session: AutomationSessionContext
  ): Promise<ResolvedAuthenticatedContext> {
    const contexts = browserSession.browser.contexts();

    if (contexts.length === 0) {
      throw new Error(
        "No browser contexts were exposed over CDP. Launch Chrome/Chromium with remote debugging enabled and reuse the same profile where you authenticated to Veles."
      );
    }

    const preferredUrl = session.preferredPageUrl ?? this.backtestUrl ?? this.baseUrl;
    const context = this.pickContext(contexts, preferredUrl);
    const existingPage = this.pickPage(context.pages(), preferredUrl);

    if (existingPage !== undefined) {
      return {
        context,
        page: existingPage,
        createdPage: false
      };
    }

    return {
      context,
      page: await context.newPage(),
      createdPage: true
    };
  }

  private pickContext(contexts: BrowserContext[], preferredUrl: string): BrowserContext {
    for (const context of contexts) {
      if (this.pickPage(context.pages(), preferredUrl) !== undefined) {
        return context;
      }
    }

    const fallbackContext = contexts[0];

    if (fallbackContext === undefined) {
      throw new Error("No browser contexts are available in the attached CDP session.");
    }

    console.warn(
      `[AuthenticatedContextResolver] No context contained a page matching "${preferredUrl}". ` +
        `Falling back to the first available context. Make sure Veles is open and authenticated in the attached browser.`
    );

    return fallbackContext;
  }

  private pickPage(pages: Page[], preferredUrl: string): Page | undefined {
    const normalizedPrefix = normalizePrefix(preferredUrl);

    return pages.find((page) => page.url().startsWith(normalizedPrefix));
  }
}

function normalizePrefix(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}
