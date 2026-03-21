import type { Page } from "playwright";

const VELES_URL_FRAGMENT = "veles.finance";

export function isVelesTabUrl(url: string): boolean {
  return url.includes(VELES_URL_FRAGMENT);
}

export function findFirstVelesPage(pages: Page[]): Page | undefined {
  return pages.find((page) => isVelesTabUrl(page.url()));
}
