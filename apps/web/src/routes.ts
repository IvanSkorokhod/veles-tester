export type AppRoutePath =
  | "/"
  | "/strategy-templates"
  | "/parameter-spaces"
  | "/experiments"
  | "/runs"
  | "/settings";

export interface AppRouteDefinition {
  path: AppRoutePath;
  label: string;
  description: string;
}

export const NAVIGATION_ITEMS: AppRouteDefinition[] = [
  {
    path: "/",
    label: "Dashboard",
    description: "Operational summary"
  },
  {
    path: "/strategy-templates",
    label: "Strategy Templates",
    description: "Reviewed workflow definitions"
  },
  {
    path: "/parameter-spaces",
    label: "Parameter Spaces",
    description: "Executable input ranges"
  },
  {
    path: "/experiments",
    label: "Experiments",
    description: "Queued backtest batches"
  },
  {
    path: "/runs",
    label: "Runs",
    description: "Execution outcomes"
  },
  {
    path: "/settings",
    label: "Settings",
    description: "Local environment controls"
  }
];

const DEFAULT_ROUTE: AppRouteDefinition = NAVIGATION_ITEMS[0] ?? {
  path: "/",
  label: "Dashboard",
  description: "Operational summary"
};

const ROUTE_MAP = new Map(NAVIGATION_ITEMS.map((item) => [item.path, item] as const));

export function resolveRouteDefinition(pathname: string): AppRouteDefinition {
  return ROUTE_MAP.get(normalizePath(pathname)) ?? DEFAULT_ROUTE;
}

function normalizePath(pathname: string): AppRoutePath {
  const sanitizedPath = pathname.trim().replace(/\/+$/, "") || "/";

  if (sanitizedPath === "/") {
    return "/";
  }

  return ROUTE_MAP.has(sanitizedPath as AppRoutePath) ? (sanitizedPath as AppRoutePath) : "/";
}
