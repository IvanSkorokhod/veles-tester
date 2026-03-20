import type { Page } from "playwright";

import { resolveConfiguredSelector, type VelesLoginSelectorConfig } from "../veles-selector-registry.js";

export class VelesLoginPage {
  public constructor(
    private readonly page: Page,
    private readonly baseUrl: string,
    private readonly selectors: VelesLoginSelectorConfig
  ) {}

  public async open(): Promise<void> {
    await this.page.goto(this.buildUrl(this.selectors.loginPath), {
      waitUntil: "domcontentloaded"
    });
  }

  public async isLoginFormVisible(): Promise<boolean> {
    const loginForm = this.page.locator(resolveConfiguredSelector("loginFormIndicator", this.selectors.loginFormIndicator));

    return loginForm
      .first()
      .isVisible({
        timeout: 1_500
      })
      .catch(() => false);
  }

  public async isLoggedIn(): Promise<boolean> {
    const loggedInIndicator = this.page.locator(
      resolveConfiguredSelector("loggedInIndicator", this.selectors.loggedInIndicator)
    );

    return loggedInIndicator
      .first()
      .isVisible({
        timeout: 1_500
      })
      .catch(() => false);
  }

  public async login(login: string, password: string): Promise<void> {
    await this.open();

    await this.page
      .locator(resolveConfiguredSelector("usernameInput", this.selectors.usernameInput))
      .fill(login);
    await this.page
      .locator(resolveConfiguredSelector("passwordInput", this.selectors.passwordInput))
      .fill(password);
    await this.page.locator(resolveConfiguredSelector("submitButton", this.selectors.submitButton)).click();
    await this.page
      .locator(resolveConfiguredSelector("loggedInIndicator", this.selectors.loggedInIndicator))
      .waitFor({
        state: "visible",
        timeout: 30_000
      });
  }

  private buildUrl(pathSegment: string): string {
    if (this.baseUrl.trim().length === 0) {
      throw new Error("VELES_BASE_URL must be configured before Veles automation can run.");
    }

    return new URL(resolveConfiguredSelector("loginPath", pathSegment), this.baseUrl).toString();
  }
}
