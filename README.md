# Veles Tester

Veles Tester is a TypeScript monorepo scaffold for browser-driven backtesting automation on the Veles Finance web platform. The repository is aligned with [docs/PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md), which remains the canonical project memory for architecture, scope, and constraints.

## Current Scope

This repository currently contains the MVP scaffold only:

- Fastify-based API skeleton
- BullMQ worker skeleton
- React frontend skeleton
- shared domain types and job payload contracts
- Prisma schema draft
- Docker Compose for PostgreSQL and Redis
- Veles adapter, result parser, ranking engine, and discovery modules as explicit TODO-backed placeholders

No real Veles browser flow, experiment persistence flow, parsing logic, or ranking logic has been implemented yet.

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

3. Start PostgreSQL and Redis:

```bash
corepack pnpm db:up
```

4. Install workspace dependencies:

```bash
corepack pnpm install
```

5. Generate the Prisma client:

```bash
corepack pnpm prisma:generate
```

6. Start the scaffold in development mode:

```bash
corepack pnpm dev
```

This runs:

- `@veles/shared` in watch mode
- `@veles/api`
- `@veles/worker`
- `@veles/web`

## Service Endpoints

- API: `http://localhost:3000`
- Web: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Notes

- The worker owns browser automation concerns.
- Veles-specific selectors are intentionally isolated under `apps/worker/src/modules/veles-adapter`.
- Shared domain types, job payloads, and schema contracts live under `packages/shared/src`.
- Job processors intentionally throw TODO errors until business logic is implemented.
- Update `docs/PROJECT_CONTEXT.md` first whenever implementation changes architecture or scope.
