import type { VelesBotsListResponse } from "@veles/shared";

import { AttachedBrowserSessionService } from "../veles/attached-browser-session.service.js";
import { VelesIntegrationError } from "../veles/veles-integration.error.js";
import { isRawBotsListResponse, mapRawBotToSummary } from "./veles-bots.mapper.js";
import type { RawVelesBotDto, RawVelesBotsListResponseDto } from "./veles-bots.types.js";

interface BotRequestResult {
  ok: boolean;
  status: number;
  statusText: string;
  responseUrl: string;
  contentType: string | null;
  bodyText: string;
}

interface CsrfMetaElementLike {
  getAttribute(name: string): string | null;
}

interface DocumentLike {
  querySelector(selector: string): CsrfMetaElementLike | null;
}

const BOTS_PAGE_SIZE = 100;
const BOTS_SORT = "createdAt,desc";

// Donor-adapted from de-don/veles-tools:
// conceptually the same authenticated /api/bots workflow, but rewritten to run through the attached Playwright page
// instead of browser-extension proxy messaging.
export class VelesBotsService {
  public constructor(private readonly attachedBrowserSessionService: AttachedBrowserSessionService) {}

  public async listBots(): Promise<VelesBotsListResponse> {
    const resolvedPage = await this.attachedBrowserSessionService.requireVelesPage();
    const rawBots: RawVelesBotDto[] = [];
    let page = 0;
    let totalPages = 1;
    let totalCount = 0;

    while (page < totalPages) {
      const response = await this.requestBotsPage(resolvedPage.page, resolvedPage.sourceOrigin, page);

      if (response.status === 401 || response.status === 403 || looksLikeHtml(response)) {
        throw new VelesIntegrationError("SESSION_UNAUTHORIZED", "The attached Veles session is no longer authorized.", {
          status: response.status,
          statusText: response.statusText,
          responseUrl: response.responseUrl,
          contentType: response.contentType,
          pageUrl: resolvedPage.pageUrl
        });
      }

      if (!response.ok) {
        throw new VelesIntegrationError("REQUEST_FAILED", "The Veles bot list request failed.", {
          status: response.status,
          statusText: response.statusText,
          responseUrl: response.responseUrl,
          pageUrl: resolvedPage.pageUrl
        });
      }

      const payload = parseBotsResponse(response.bodyText, response);
      const content = Array.isArray(payload.content) ? payload.content : [];
      rawBots.push(...content);

      totalCount = readPositiveInteger(payload.totalElements) ?? rawBots.length;
      totalPages = readPositiveInteger(payload.totalPages) ?? (content.length === 0 ? page + 1 : page + 2);
      page += 1;

      if (content.length === 0) {
        break;
      }
    }

    return {
      bots: rawBots.map(mapRawBotToSummary),
      totalCount,
      sourceOrigin: resolvedPage.sourceOrigin,
      retrievedAt: new Date().toISOString()
    };
  }

  private async requestBotsPage(page: import("playwright").Page, origin: string, pageNumber: number): Promise<BotRequestResult> {
    const requestUrl = new URL("/api/bots", withTrailingSlash(origin));
    requestUrl.searchParams.set("page", String(pageNumber));
    requestUrl.searchParams.set("size", String(BOTS_PAGE_SIZE));
    requestUrl.searchParams.set("sort", BOTS_SORT);

    try {
      return await page.evaluate(
        async ({ url }) => {
          const headers = new Headers({
            accept: "application/json, text/plain, */*",
            "content-type": "application/json"
          });
          const pageDocument = (globalThis as { document?: DocumentLike }).document;
          const csrfToken = pageDocument?.querySelector('meta[name="_csrf"]')?.getAttribute("content")?.trim();

          if (csrfToken) {
            headers.set("x-csrf-token", csrfToken);
          }

          const response = await fetch(url, {
            method: "PUT",
            credentials: "include",
            headers,
            body: JSON.stringify({})
          });

          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            responseUrl: response.url,
            contentType: response.headers.get("content-type"),
            bodyText: await response.text()
          };
        },
        {
          url: requestUrl.toString()
        }
      );
    } catch (error) {
      throw new VelesIntegrationError("REQUEST_FAILED", "Failed to execute the Veles bot list request in the attached browser session.", {
        requestUrl: requestUrl.toString(),
        cause: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

function parseBotsResponse(bodyText: string, response: BotRequestResult): RawVelesBotsListResponseDto {
  try {
    const parsed = JSON.parse(bodyText) as unknown;

    if (!isRawBotsListResponse(parsed)) {
      throw new Error("Expected a paginated bot-list object.");
    }

    return parsed;
  } catch (error) {
    throw new VelesIntegrationError("PARSING_FAILED", "Failed to parse the Veles bot list response.", {
      status: response.status,
      statusText: response.statusText,
      responseUrl: response.responseUrl,
      contentType: response.contentType,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function looksLikeHtml(response: BotRequestResult): boolean {
  const contentType = response.contentType?.toLowerCase() ?? "";
  const trimmedBody = response.bodyText.trim().toLowerCase();

  return (
    contentType.includes("text/html") ||
    trimmedBody.startsWith("<!doctype html") ||
    trimmedBody.startsWith("<html")
  );
}

function readPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const integer = Math.trunc(value);
  return integer >= 0 ? integer : null;
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
