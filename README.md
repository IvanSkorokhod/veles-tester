# Veles Tester

Veles Tester is a TypeScript monorepo scaffold for browser-driven backtesting automation on the Veles Finance web platform. The repository is aligned with [docs/PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md), which remains the canonical project memory for architecture, scope, and constraints.

## Current Scope

This repository currently contains the first MVP vertical slice:

- Fastify API endpoints for the fixed backtest slice
- BullMQ-backed worker execution and result parsing flow
- React frontend scaffold
- shared domain types and job payload contracts
- Prisma schema and migration for templates, experiments, runs, artifacts, and results
- Docker Compose for PostgreSQL and Redis
- Veles adapter and page objects for one fixed backtest workflow, with selector placeholders still requiring manual capture

The implemented scope is intentionally narrow: one fixed workflow, two numeric parameters, one run per experiment, and CDP attachment to an already authenticated browser session. Discovery mode, staged optimization, and ranking are still not implemented.

## Repository Layout

```text
apps/
  api/
  worker/
  web/
docs/
  PROJECT_CONTEXT.md
packages/
  config/
  shared/
prisma/
  schema.prisma
```

## Prerequisites

- Node.js 20+
- Corepack
- Docker

## Local Setup

1. Enable Corepack and prepare `pnpm`:

```bash
corepack enable
```

2. Copy the root environment file:

```bash
cp .env.example .env
```

Set `VELES_BASE_URL` and `BROWSER_CDP_URL` in `.env` before creating real runs. Set `VELES_BACKTEST_URL` too if you want to open the backtest page directly without relying on a captured relative path in the selector registry. `VELES_EXPECTED_HOST` defaults to `veles.finance` and is used by the read-only browser-session probe. `PLAYWRIGHT_HEADLESS` defaults to `false`; in the current CDP-attached MVP, the browser visibility is primarily determined by how you launch the attached Chromium-based automation browser yourself.

3. Recommended local workflow: use Microsoft Edge as the dedicated automation browser for Veles, and keep the dashboard in any browser you prefer.

Launch Microsoft Edge with remote debugging enabled and a separate user data directory:

```bash
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.veles-tester-edge"
```

After Edge opens, authenticate to Veles manually in that profile, open the relevant `veles.finance` page, and keep that browser running. The dashboard and internal web UI can be opened in Safari, Firefox, Chrome, or any other browser because they do not need to share the automation session.

4. Start PostgreSQL and Redis:

```bash
corepack pnpm db:up
```

5. Install workspace dependencies:

```bash
corepack pnpm install
```

6. Generate the Prisma client:

```bash
corepack pnpm prisma:generate
```

7. Start the scaffold in development mode:

```bash
corepack pnpm dev
```

This runs:

- `@veles/shared` in watch mode
- `@veles/api`
- `@veles/worker`
- `@veles/web`

8. Open the dashboard in any browser at `http://localhost:5173` and confirm that the Browser Session status shows the attached Veles tab from the dedicated Edge automation session.

## Service Endpoints

- API: `http://localhost:3000`
- Web: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Notes

- The first implemented vertical slice supports one fixed backtest workflow with two numeric parameters and one queued run per experiment.
- The worker owns browser automation concerns.
- The MVP attaches to an already authenticated Chromium-based browser session over CDP instead of automating credential entry.
- Microsoft Edge is the recommended local automation browser because it is Chromium-based and works cleanly with Playwright CDP attachment, but the dashboard can be opened in any browser.
- Veles-specific selectors are intentionally isolated under `apps/worker/src/modules/veles-adapter`.
- Shared domain types, job payloads, and schema contracts live under `packages/shared/src`.
- Veles selectors in `apps/worker/src/modules/veles-adapter/veles-selector-registry.ts` still require manual capture before live browser automation can succeed.
- Update `docs/PROJECT_CONTEXT.md` first whenever implementation changes architecture or scope.
