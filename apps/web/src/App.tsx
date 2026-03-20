import { useEffect, useState, type JSX } from "react";

import { DashboardPage } from "./pages/dashboard-page.js";
import { ExperimentsPage } from "./pages/experiments-page.js";
import { ParameterSpacesPage } from "./pages/parameter-spaces-page.js";
import { RunsPage } from "./pages/runs-page.js";
import { SettingsPage } from "./pages/settings-page.js";
import { StrategyTemplatesPage } from "./pages/strategy-templates-page.js";
import { NAVIGATION_ITEMS, resolveRouteDefinition, type AppRoutePath } from "./routes.js";

const PAGE_COMPONENTS: Record<AppRoutePath, () => JSX.Element> = {
  "/": DashboardPage,
  "/strategy-templates": StrategyTemplatesPage,
  "/parameter-spaces": ParameterSpacesPage,
  "/experiments": ExperimentsPage,
  "/runs": RunsPage,
  "/settings": SettingsPage
};

function readCurrentPath(): AppRoutePath {
  return resolveRouteDefinition(window.location.pathname).path;
}

export function App() {
  const [currentPath, setCurrentPath] = useState<AppRoutePath>(readCurrentPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(readCurrentPath());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const currentRoute = resolveRouteDefinition(currentPath);

  const navigate = (path: AppRoutePath) => {
    if (path === currentPath) {
      return;
    }

    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <p className="sidebar__eyebrow">Internal Tool</p>
          <h1>Veles Tester</h1>
          <p className="sidebar__description">
            Browser-driven backtest execution, run review, and operator visibility for the MVP slice.
          </p>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          {NAVIGATION_ITEMS.map((item) => (
            <a
              key={item.path}
              className={item.path === currentPath ? "nav-link nav-link--active" : "nav-link"}
              href={item.path}
              onClick={(event) => {
                event.preventDefault();
                navigate(item.path);
              }}
            >
              <span className="nav-link__label">{item.label}</span>
              <span className="nav-link__description">{item.description}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="shell__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">MVP Application Shell</p>
            <h2>{currentRoute.label}</h2>
          </div>
          <div className="topbar__meta">
            <span className="status-pill">Local Dev</span>
            <span className="topbar__path">{currentRoute.path}</span>
          </div>
        </header>

        <main className="content" aria-live="polite">
          {renderPage(currentPath)}
        </main>
      </div>
    </div>
  );
}

function renderPage(path: AppRoutePath): JSX.Element {
  const Component = PAGE_COMPONENTS[path];
  return <Component />;
}
