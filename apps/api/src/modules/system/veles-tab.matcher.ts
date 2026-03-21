import type { Page } from "playwright";

export function isVelesTabUrl(url: string, expectedHost: string): boolean {
  const normalizedUrl = url.trim().toLowerCase();
  const normalizedHost = expectedHost.trim().toLowerCase();

  return normalizedUrl.length > 0 && normalizedHost.length > 0 && normalizedUrl.includes(normalizedHost);
}

export function findFirstVelesPage(pages: Page[], expectedHost: string): Page | undefined {
  return pages.find((page) => isVelesTabUrl(page.url(), expectedHost));
}
