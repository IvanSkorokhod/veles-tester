# PROJECT_CONTEXT

This file is the canonical memory and single source of truth for the project.

- Every future implementation step must refer to this file.
- If architecture, scope, or requirements change, update this file first.
- Confirmed decisions must stay separate from assumptions and open questions.
- Do not add unsupported features to this document as if they were approved scope.

---

## 1. Project Overview

This project is a third-party application that automates backtesting on the Veles Finance web platform through the user's own account. The core reason for the project is that there is no official API for the required workflow, so the system must drive the existing web interface in a controlled and repeatable way.

The product is not intended to be a generic web crawler or a universal UI bot. It is a workflow-specific automation system that knows how to attach to an already authenticated browser session, navigate the relevant Veles screens, apply strategy parameters through known controls, start backtests, and collect the resulting metrics. The emphasis is on deterministic behavior, reproducibility, and controlled coverage of supported strategies.

The system will use declarative strategy templates and parameter schemas to describe how a supported strategy maps to the Veles interface. Those schemas will define which controls exist, how values should be applied, what dependencies exist between parameters, and how results should be interpreted. This approach is chosen instead of blind DOM enumeration because the project needs stable automation, schema versioning, and the ability to adapt to UI changes without rewriting the entire orchestration layer.

At the execution level, the system will create experiments, expand them into staged parameter-search runs, execute those runs through Playwright workers, normalize the collected results, and store all inputs and outputs in a structured database. A ranking layer will then evaluate candidate configurations using profitability and robustness criteria rather than raw profit alone.

The initial scope is practical and narrow: prove one reliable end-to-end Veles backtest flow, store all run data, and provide enough visibility for a user to validate top candidates manually. Wider strategy coverage, richer discovery tooling, and more advanced ranking logic can be added later, but only after the first supported workflow is stable.

---

## 2. Business Goal

- Primary goal: reduce manual effort in running and comparing large numbers of Veles backtests by automating the browser-driven workflow end to end.
- Secondary goals:
  - Make backtests reproducible by storing exact input parameters, schema versions, raw outputs, and normalized metrics.
  - Improve search efficiency through staged optimization instead of brute-force exploration of every possible combination.
  - Give the user a structured way to compare profitability and robustness across candidate parameter sets.
- Expected outcome: a user can define an experiment, let the system execute browser-based backtests on Veles, review normalized and ranked results, and manually validate the best configurations without repeating the full workflow by hand.

---

## 3. Core Use Case

The main user flow is:

1. User defines strategy template.
2. User defines parameter space.
3. User launches experiment.
4. Worker runs browser-based backtests in Veles.
5. Results are collected and normalized.
6. System ranks best configurations.
7. User validates top candidates.

In practice, this means the user selects a known supported strategy template, configures the parameter ranges or allowed values to explore, and starts an experiment. The orchestrator expands that experiment into staged runs, the worker runtime executes each run through Playwright against the Veles UI, and the result pipeline persists both raw and normalized data. The ranking engine then computes candidate scores so the user can focus on a short list of promising configurations for manual review.

---

## 4. Confirmed Constraints

- No official API exists for the required Veles backtesting workflow.
- Access is available only through the user's own web account.
- Backtests must be initiated through browser automation.
- The system must not depend on blind full-DOM brute-force crawling.
- The system should use declarative parameter schemas.
- The system should support future adaptation if the Veles UI changes.
- Playwright is the required browser automation layer.
- The MVP will assume the user authenticates to Veles manually in a browser before the worker attaches.
- The preferred local automation browser is Microsoft Edge, running as a dedicated Chromium-based CDP session for Veles.
- The preferred implementation stack is TypeScript, Node.js, PostgreSQL, Prisma, Redis, BullMQ, React, and Fastify for the backend framework.

---

## 5. Assumptions

- The first implementation will support a narrow set of Veles workflows rather than every possible strategy or page.
- One active Veles account per deployment is acceptable for the initial version unless multi-account support is explicitly required later.
- The MVP will attach to one already running Chromium-based browser through CDP rather than automating credential entry.
- The user can manually prepare an authenticated Veles tab in a dedicated automation browser before the worker attempts a run.
- The dashboard and internal web UI may be opened in any browser and do not need to share the automation browser session.
- The Veles UI exposes enough visible information to extract the metrics needed for profitability and robustness evaluation.
- Semi-automatic discovery output will always require manual review before it is used in production experiments.
- Conservative worker concurrency will be necessary to avoid session instability, anti-bot triggers, or inconsistent results.
- Diagnostic artifacts such as screenshots and HTML snapshots may initially be stored on local disk or simple file storage before a more formal artifact storage layer is introduced.

---

## 6. Out of Scope

The following items are intentionally excluded from the MVP:

- Live trading execution.
- Portfolio management or account management beyond what is necessary for backtesting automation.
- A generic crawler that discovers and drives arbitrary unknown controls automatically.
- Support for non-Veles platforms.
- Automatic self-healing against unknown UI changes without schema maintenance or manual review.
- A public multi-tenant SaaS product with organization/user billing concerns.
- Full support for every Veles strategy type from day one.
- Mobile applications.

---

## 7. Functional Requirements

### 7.1 Authentication / Session Handling

- The system must run using the user's own Veles account context.
- The MVP must attach to an already authenticated browser session through CDP.
- The system must detect expired, unauthenticated, or unusable attached sessions and fail clearly.
- The system must avoid leaking credentials or session material through logs or stored artifacts.
- The system should expose a read-only browser-session probe so the UI can report whether an attached browser session currently has a Veles tab open.

### 7.2 Browser Automation

- The system must navigate the supported Veles backtesting workflow deterministically.
- The system must apply parameter values through known UI controls defined by a strategy template.
- The system must verify page state before and after critical actions where feasible.
- The system must start backtests and wait for completion, failure, or timeout.
- The system must capture diagnostic evidence when automation fails.

### 7.3 Strategy Templates

- The system must support versioned strategy templates.
- Each strategy template must define supported parameters, UI control mappings, dependencies, parser hints, and normalization hints.
- Only reviewed and approved templates should be executable in optimization runs.
- Template changes must not silently invalidate the reproducibility of historical runs.

### 7.4 Parameter Spaces

- The system must allow users to define parameter spaces for a selected strategy template.
- The parameter space must support discrete values, numeric ranges, booleans, and conditional parameters where supported by the template.
- The system must validate parameter spaces against template rules before any run is queued.
- The parameter space definition must be stored so the experiment can be reproduced later.

### 7.5 Experiment Management

- The system must allow users to create experiments from a strategy template and parameter space.
- The system must store experiment objectives, execution settings, and ranking configuration.
- The system must expand experiments into staged runs rather than a mandatory full cartesian brute-force expansion.
- The system must track experiment status, stage status, run counts, and terminal outcomes.

### 7.6 Queue / Workers

- The system must execute backtests through background jobs rather than through synchronous API calls.
- The worker runtime must process runs through BullMQ-backed queues.
- Jobs must be retryable when failures are classified as recoverable.
- Workers must respect concurrency limits appropriate to the Veles account and workflow stability.

### 7.7 Result Collection

- The system must extract raw run results from the Veles UI.
- The system must normalize those results into a stable internal result model.
- The system must store raw extraction payloads, normalized metrics, and execution metadata for each run.
- The system must link every result to the exact template version and parameter values used.

### 7.8 Ranking / Scoring

- The system must rank candidate configurations using more than raw profit alone.
- The system must support profitability and robustness evaluation.
- The system must preserve the ranking inputs and formula version used for each ranking calculation.
- Ranking outputs must be traceable back to the underlying runs and metrics.

### 7.9 UI / Reporting

- The system must provide a web UI for managing experiments and reviewing results.
- The UI must show experiment status, run status, normalized metrics, and ranking outputs.
- The UI must make it possible to inspect top candidates before manual validation in Veles.
- The UI should expose enough failure detail to understand why a run failed without opening raw logs first.
- The MVP web root should be a dashboard-oriented internal tool shell rather than a marketing or scaffold landing page.

### 7.10 Logging / Debugging

- The system must emit structured logs for API actions, orchestration events, worker execution, browser steps, and result parsing.
- The system must capture screenshots on important failures.
- The system should capture HTML snapshots for parser or selector debugging when useful.
- The system should capture targeted network logs when they help diagnose browser behavior, without turning undocumented network calls into a hidden dependency by default.

---

## 8. Non-Functional Requirements

- Reliability: automation should handle normal page delays, expected UI transitions, and recoverable transient failures without corrupting experiment state.
- Idempotency: queued jobs must be safe to retry, and repeated execution should not create duplicate final results for the same logical run unless a new attempt is explicitly recorded.
- Observability: logs, job status, artifacts, and run metadata must be sufficient to diagnose failures and audit outcomes.
- Maintainability: selectors, template definitions, orchestration logic, and ranking logic must stay in separate modules with explicit contracts.
- Recoverability: failed runs should preserve enough evidence and state to support retry, debugging, or manual inspection.
- Low coupling: business logic must not be embedded inside Playwright page objects or directly tied to the transport layer.
- Extensibility: the architecture should allow new strategy templates, parser rules, and ranking profiles to be added without redesigning the core system.

---

## 9. Proposed Tech Stack

### Backend

- Node.js with TypeScript.
- Fastify for the API/service layer.
- Prisma for database access and schema migrations.

### Browser Automation

- Playwright as the primary and required automation layer.
- Playwright CDP attachment to an already running Chromium-based automation browser for the MVP.
- Microsoft Edge is the preferred local automation browser because it is Chromium-based and compatible with Playwright CDP workflows.

### Queue

- Redis for queue state and coordination.
- BullMQ for experiment and run job processing.

### Database

- PostgreSQL as the primary system of record for templates, experiments, runs, results, and ranking snapshots.

### Frontend

- React for the web UI.
- Shared TypeScript types between frontend and backend where practical.
- Lightweight client-side route handling inside the web app is acceptable for the MVP until nested data workflows justify a dedicated routing dependency.

### DevOps / Local Environment

- `pnpm` workspaces will be used for the monorepo.
- Docker Compose will be used for local PostgreSQL and Redis.
- Separate local processes for API server, worker runtime, and web UI are preferred during development.

These stack choices are confirmed for the initial scaffold unless changed by a future documented decision.

---

## 10. System Architecture

The system should be structured as a modular application with clear boundaries between domain logic, orchestration, browser execution, parsing, ranking, and presentation. The API server accepts user intent, such as creating experiments or reviewing results, but it does not perform browser automation directly. Instead, it persists domain state and enqueues background work.

The experiment orchestrator is responsible for turning an experiment definition into staged execution work. It reads the selected strategy template and parameter space, generates candidate runs for the current stage, and queues execution jobs. It also decides when a later stage should be created, for example to refine around high-performing candidates instead of expanding the entire search space at once.

The worker runtime consumes queued jobs and delegates all Veles interaction to the browser adapter. The adapter knows how to attach to the already running browser session, resolve an authenticated context/page, navigate to the correct UI, apply parameters defined by the template, trigger the backtest, and collect raw output. It returns a structured execution payload rather than domain decisions.

The result parser normalizes raw output into a stable internal metric model, and the ranking engine computes a ranking snapshot for a given experiment or stage. The UI reads experiment, run, artifact, and ranking data from the API so the user can monitor progress and inspect the best configurations. A separate discovery module may inspect supported Veles pages and generate draft template metadata, but it is a support tool only and not part of the core execution path.

The intended interaction flow is:

1. User works in the web UI.
2. API server validates input and stores experiment data.
3. API server or orchestrator enqueues `experiment.create` and `experiment.expand`.
4. Worker runtime executes `run.execute` jobs through the browser adapter.
5. Raw outputs and artifacts are stored.
6. Result parser writes normalized results.
7. Ranking engine recalculates ranking snapshots.
8. Web UI reads current state through the API.

---

## 11. Main Modules

### 11.1 API Server

Responsibilities:

- Expose endpoints for strategy templates, experiments, runs, rankings, and artifacts.
- Validate external input and map it into domain commands.
- Persist domain records and enqueue background work.

Must not:

- Contain Playwright automation code.
- Contain ranking formulas inline inside controllers.

### 11.2 Browser Adapter

Responsibilities:

- Manage the Playwright-side lifecycle for the selected authenticated context/page during a run.
- Attach to an already running browser session and resolve an authenticated context/page.
- Navigate the supported Veles workflow.
- Apply parameters, run backtests, and collect evidence.

Must not:

- Make experiment-planning decisions.
- Contain database-specific business workflows.

### 11.3 Discovery Module

Responsibilities:

- Scan supported Veles pages and dialogs.
- Extract candidate controls, labels, roles, attributes, and selector hints.
- Produce draft template metadata for manual review.

Must not:

- Run production optimization jobs directly.
- Auto-approve discovered schemas.

### 11.4 Experiment Orchestrator

Responsibilities:

- Expand experiments into staged candidate runs.
- Apply search policy rules and progression between stages.
- Track experiment and stage lifecycle state.

Must not:

- Depend on raw DOM selectors.
- Parse browser pages directly.

### 11.5 Worker Runtime

Responsibilities:

- Consume queued jobs.
- Execute runs idempotently where possible.
- Store attempt information, outcomes, and failure classification.

Must not:

- Reimplement template validation or ranking policy independently from shared services.

### 11.6 Result Parser

Responsibilities:

- Transform raw UI output into normalized result records.
- Apply parser hints and normalization hints from the active template.
- Preserve raw payloads for audit and reprocessing.

### 11.7 Ranking Engine

Responsibilities:

- Compute ranking scores from normalized metrics.
- Apply robustness penalties, filters, and weighting rules.
- Produce ranking snapshots for experiments or stages.

### 11.8 Web UI

Responsibilities:

- Create experiments from approved templates.
- Show run progress, failures, rankings, and artifacts.
- Support manual validation of top candidates.

---

## 12. Domain Model

### UserAccountSession

Represents the local system's automation session for a user's Veles account, including enough information to reuse or validate authenticated browser state.

### StrategyTemplate

Represents a supported Veles strategy/backtest workflow definition, including parameter metadata, control mappings, parser hints, and template version.

### ParameterDefinition

Represents one logical strategy parameter, including data type, selector metadata, validation rules, dependency rules, and normalization hints.

### ParameterSpace

Represents the user-defined search space for an experiment, including discrete values, ranges, constraints, and staged search hints derived from parameter definitions.

### Experiment

Represents a user-created optimization or evaluation job that targets one strategy template with one parameter space and one ranking configuration.

### ExperimentRun

Represents one concrete execution attempt for one parameter combination within an experiment stage.

### RunArtifact

Represents a file or stored payload produced during execution, such as a screenshot, HTML snapshot, network log, or debug trace.

### BacktestResult

Represents the normalized result of a completed run, including extracted metrics, parser metadata, and links to raw payloads.

### RankingSnapshot

Represents the scoring output for a set of runs at a specific point in time, including the scoring method and ordered candidate list.

---

## 13. Data Model Overview

### UserAccountSession

- Purpose: track usable browser-authenticated access to the user's Veles account.
- Main fields:
  - `id`
  - `accountLabel`
  - `sessionStateRef`
  - `status`
  - `lastValidatedAt`
  - `expiresAt`
  - `createdAt`
  - `updatedAt`

### StrategyTemplate

- Purpose: define a supported automation contract for one Veles workflow.
- Main fields:
  - `id`
  - `templateKey`
  - `version`
  - `displayName`
  - `status`
  - `workflowKey`
  - `parameterSchemaJson`
  - `parserConfigJson`
  - `normalizationConfigJson`
  - `createdAt`
  - `updatedAt`

### ParameterDefinition

- Purpose: store one parameter definition belonging to a strategy template version.
- Main fields:
  - `id`
  - `strategyTemplateId`
  - `key`
  - `label`
  - `type`
  - `selector`
  - `allowedValuesJson`
  - `rangeConfigJson`
  - `dependenciesJson`
  - `parserHintsJson`
  - `normalizationHintsJson`

### ParameterSpace

- Purpose: store the user-selected exploration boundaries for an experiment.
- Main fields:
  - `id`
  - `strategyTemplateId`
  - `spaceConfigJson`
  - `searchPolicyJson`
  - `validationSummaryJson`
  - `createdAt`

### Experiment

- Purpose: represent the high-level optimization request.
- Main fields:
  - `id`
  - `name`
  - `strategyTemplateId`
  - `parameterSpaceId`
  - `status`
  - `objectiveConfigJson`
  - `rankingProfileJson`
  - `stageCount`
  - `createdAt`
  - `updatedAt`

### ExperimentRun

- Purpose: represent one run or run attempt for a concrete parameter combination.
- Main fields:
  - `id`
  - `experimentId`
  - `stageNumber`
  - `parameterHash`
  - `parameterValuesJson`
  - `status`
  - `attemptCount`
  - `startedAt`
  - `finishedAt`
  - `failureCode`
  - `workerId`

### RunArtifact

- Purpose: store execution evidence and debug artifacts.
- Main fields:
  - `id`
  - `experimentRunId`
  - `artifactType`
  - `storageRef`
  - `mimeType`
  - `stepName`
  - `capturedAt`

### BacktestResult

- Purpose: store normalized run output and parser lineage.
- Main fields:
  - `id`
  - `experimentRunId`
  - `success`
  - `rawPayloadJson`
  - `normalizedMetricsJson`
  - `parserVersion`
  - `parsedAt`

### RankingSnapshot

- Purpose: persist ranking outputs for reproducibility and comparison.
- Main fields:
  - `id`
  - `experimentId`
  - `stageNumber`
  - `scoringConfigJson`
  - `filtersJson`
  - `rankedRunIdsJson`
  - `scoreBreakdownJson`
  - `createdAt`

Supporting operational records such as queue/job execution details will likely exist as separate tables or collections even though they are not listed as primary domain entities here.

---

## 14. Queue / Job Model

The queue layer exists to decouple experiment planning, browser execution, result parsing, and ranking recalculation. Jobs should be idempotent, traceable, and safe to retry when the failure class is recoverable.

### Job Types

#### `experiment.create`

- Validates the initial experiment request.
- Persists the experiment in `pending`.
- Enqueues `experiment.expand` for the first stage.

#### `experiment.expand`

- Reads the experiment, template, and parameter space.
- Generates the next staged batch of parameter combinations.
- Creates `run.execute` jobs for those combinations.
- May enqueue another `experiment.expand` later if staged refinement is required.

#### `run.execute`

- Claims one concrete parameter combination.
- Opens or restores a browser session through the browser adapter.
- Applies parameters, launches the backtest, collects raw outputs, and stores artifacts.
- Enqueues `result.parse`.

#### `run.retry`

- Requeues a failed run when the failure type is classified as recoverable.
- Increments attempt metadata.
- Preserves the original parameter combination and template version.

#### `result.parse`

- Reads the raw execution payload.
- Normalizes metrics into the internal result model.
- Writes or updates `BacktestResult`.
- Enqueues `ranking.recalculate` if the run outcome affects ranking.

#### `ranking.recalculate`

- Recomputes ranking outputs for the relevant experiment or stage.
- Stores a new `RankingSnapshot`.

### State Machine

The common job/run state machine is:

- `pending`: the record exists but has not been queued yet.
- `queued`: the job has been placed onto a queue and is waiting for a worker.
- `running`: a worker has claimed the job and execution is in progress.
- `succeeded`: the job completed successfully and the expected outputs were written.
- `failed`: the job terminated unsuccessfully and no further automatic action is currently scheduled.
- `cancelled`: the job or run was intentionally stopped before successful completion.

Typical transitions:

- `pending -> queued`
- `queued -> running`
- `running -> succeeded`
- `running -> failed`
- `failed -> queued` via `run.retry` when retry is allowed
- `pending|queued|running -> cancelled` when cancellation is supported for that job type

Operational notes:

- Each `run.execute` job should have a deterministic deduplication key based on experiment, stage, template version, and parameter hash.
- Retries must create a new attempt record or increment attempt metadata without losing the lineage of the original run.
- Job-level failure reasons must be stored separately from normalized backtest metrics.

---

## 15. Browser Automation Strategy

- Playwright is the primary and required automation layer.
- The automation model is schema-driven, not crawler-driven.

### Locator Strategy Priority

1. Accessible locators using role and stable visible name.
2. Stable explicit attributes such as `data-testid`, `data-qa`, or similarly durable identifiers if Veles exposes them.
3. Label-to-control relationships and surrounding semantic structure.
4. Scoped CSS locators anchored to stable containers.
5. XPath only as a last-resort fallback for controls that cannot be addressed reliably otherwise.

### Waiting Strategy

- Prefer explicit waits on visible, enabled, and stable UI state.
- Wait for page transitions, result sections, and completion cues using deterministic signals where available.
- Avoid arbitrary fixed sleeps except as tightly bounded fallback around known UI quirks.
- Treat timeouts as classified failures with diagnostic capture.

### Session Reuse

- For the MVP, attach to an already running Chromium-based automation browser through CDP instead of automating login.
- Reuse the authenticated browser profile and context that the user prepared manually in the dedicated automation browser.
- Validate session usability by opening the supported backtest page and failing clearly if the page cannot be accessed.
- Detect expired or redirected sessions early and surface a controlled error instead of attempting credential entry.
- For the MVP browser-session health check, probe the attached browser in read-only mode and return the first detected `veles.finance` tab if multiple matches are open.

### Local Development / Operator Workflow

- Use Microsoft Edge as the preferred dedicated local automation browser for Veles.
- Launch Edge with remote debugging enabled and a separate user data directory so the automation session stays isolated from everyday browsing.
- Example macOS command:
  `/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222 --user-data-dir="$HOME/.veles-tester-edge"`
- Open and authenticate to Veles inside that dedicated Edge profile before starting real worker activity.
- Open the dashboard in any browser the operator prefers; the dashboard does not need to run inside the automation browser.
- Verify the Browser Session status in the dashboard before attempting live runs.

### Screenshot Capture

- Capture screenshots on critical failures.
- Capture screenshots before or after important steps when needed for diagnosis.
- Link screenshots to run ID, step name, and timestamp.

### HTML Snapshot Capture

- Capture HTML snapshots when selector failures or parser failures occur.
- Scope snapshots to the relevant page or container when practical to reduce noise.

### Network Logging Where Helpful

- Capture targeted network logs when they help explain browser behavior, loading issues, or completion timing.
- Do not make undocumented network calls the primary integration contract unless that becomes an explicit architectural decision later.

---

## 16. Discovery Mode

Discovery mode is a semi-automatic support tool for accelerating schema creation and maintenance. It is not the main runtime strategy and must not be treated as a replacement for reviewed templates.

The discovery tool should:

- Scan supported pages or dialogs for candidate controls.
- Extract visible labels, ARIA roles, element types, names, placeholder text, related attributes, and likely selector anchors.
- Group controls by form region or interaction block where possible.
- Produce draft schema metadata that can be reviewed and refined by a developer or operator.

The discovery tool must:

- Require manual review before discovered metadata is used in optimization runs.
- Avoid launching uncontrolled backtests or mutating arbitrary controls in a brute-force fashion.
- Mark generated output as draft data, not approved template data.

Expected output from discovery mode is a draft template artifact, not a runnable final schema.

---

## 17. Parameter Schema Strategy

Declarative parameter schemas are required because the project needs deterministic automation, reproducibility, versioning, and controlled adaptation to Veles UI changes. A blind DOM enumeration approach would create unstable control mapping, excessive false combinations, weak auditability, and a high risk of running backtests with semantically invalid configurations.

With declarative schemas, each supported strategy template defines the exact set of known parameters and how they map to the Veles interface. This makes it possible to validate user input before execution, apply values consistently, version schemas over time, and keep browser adapter logic thin and predictable. It also gives the orchestrator a meaningful search space instead of an arbitrary cartesian product over every visible input element.

Parameter metadata should include fields such as:

- `key`
- `label`
- `type`
- `selector`
- `allowed values / range`
- `dependencies`
- `parser hints`
- `normalization hints`

Illustrative schema fragment:

```json
{
  "key": "take_profit_percent",
  "label": "Take Profit %",
  "type": "number",
  "selector": {
    "strategy": "label",
    "value": "Take Profit %"
  },
  "allowedValues": {
    "min": 0.5,
    "max": 10,
    "step": 0.5
  },
  "dependencies": [
    {
      "key": "exit_mode",
      "equals": "take_profit"
    }
  ],
  "parserHints": {
    "resultMetricKeys": ["netProfit", "profitFactor"]
  },
  "normalizationHints": {
    "unit": "percent",
    "decimalPlaces": 2
  }
}
```

This example is illustrative only. The exact schema shape remains an implementation decision, but the contract must stay declarative, versioned, and reviewable.

---

## 18. Ranking / Evaluation Strategy

The system must not rank configurations only by raw profit. A configuration that appears highly profitable but has unacceptable drawdown, too few trades, poor stability, or weak robustness is not a good candidate.

The ranking layer should use multi-metric evaluation based on normalized results. Candidate metrics include:

- net profit
- drawdown
- win rate
- trade count
- profit factor
- stability across periods
- robustness penalties

Practical ranking flow:

1. Apply validity filters first, such as minimum trade count or parse completeness.
2. Compute a profitability component.
3. Compute a robustness component.
4. Apply penalties for weak stability, excessive drawdown, or suspiciously thin sample size.
5. Store score breakdowns alongside final rank so decisions remain auditable.

Metrics that depend on Veles output availability remain subject to confirmation. If a metric cannot be extracted reliably from the supported workflow, it should remain in the candidate list until confirmed or removed.

---

## 19. Risks

### Technical Risks

- Veles UI changes may break selectors, workflows, or parser assumptions.
- Browser automation can become flaky if synchronization is weak.
- Session reuse may fail across browser or platform changes.
- Poorly designed retries could duplicate runs or corrupt state lineage.
- Result normalization may drift if raw UI labels or metric formats change.

### Product and Operational Risks

- Veles may introduce anti-bot protections, rate limits, or session restrictions.
- Terms-of-service constraints may limit acceptable automation patterns.
- Ranking logic may bias toward attractive but fragile strategies if robustness penalties are weak.
- Over-expanding scope too early could delay delivery of the first reliable workflow.

### Mitigation Direction

- Support one narrow workflow first.
- Keep templates versioned and reviewed.
- Store raw evidence for replay and debugging.
- Use conservative concurrency defaults.
- Keep ranking logic explicit and auditable.

---

## 20. Milestones

### Phase 1: PoC

- Validate CDP attachment to a manually authenticated browser session.
- Automate one supported Veles backtest flow with Playwright.
- Extract at least a minimal set of result metrics.

### Phase 2: Basic Experiment Engine

- Introduce PostgreSQL, Prisma, Redis, and BullMQ.
- Persist templates, experiments, runs, and raw results.
- Execute multi-run experiments through queued workers.

### Phase 3: Discovery + Schema Editor

- Add discovery mode for draft control extraction.
- Add a practical way to review and maintain strategy templates.
- Improve schema/version management.

### Phase 4: Ranking + Validation

- Add multi-metric ranking and score breakdowns.
- Add UI support for comparing and validating top candidates.
- Support staged experiment refinement.

### Phase 5: Hardening

- Improve diagnostics, retries, observability, and selector resilience.
- Tune concurrency and operational safety.
- Prepare for controlled expansion to more templates or workflows.

---

## 21. Coding Standards

- TypeScript strict mode.
- Modular design.
- No business logic inside Playwright page objects.
- No hidden global state.
- Clear interface boundaries.
- Testability-first.
- Prefer explicit types and validated contracts between modules.
- Keep browser selectors isolated from orchestration and ranking logic.
- Store timestamps in UTC.

---

## 22. Repository Conventions

The folder structure below reflects the current scaffold baseline:

```text
docs/
  PROJECT_CONTEXT.md

apps/
  api/
  worker/
  web/

packages/
  shared/
  config/

prisma/

infra/
  docker/

scripts/
```

Conventions:

- `apps/api`: HTTP API server and application entry points.
- `apps/worker`: BullMQ workers and job processors.
- `apps/web`: React UI.
- `packages/shared`: domain model types, parameter schema contracts, job payload types, result model contracts, and other shared interfaces.
- `packages/config`: shared TypeScript and application configuration helpers.
- `prisma`: root Prisma schema and migration history.
- Veles-specific browser automation must initially live in a dedicated module under the worker app and not be spread across unrelated files.
- The dedicated domain model module will initially live under `packages/shared/src/domain`.
- Discovery mode should be scaffolded as its own module path even if only a stub implementation exists in the initial version.

---

## 23. Decision Log

### Entry 1

- Date: 2026-03-20
- Decision: `docs/PROJECT_CONTEXT.md` is the canonical memory and single source of truth for the project.
- Reason: Architectural and scope decisions must persist across iterations.
- Consequences: Future implementation changes must update this file first when they affect project direction.

### Entry 2

- Date: 2026-03-20
- Decision: The system will automate Veles through the user's own account rather than through an API integration.
- Reason: The required Veles workflow does not have an official API.
- Consequences: Browser automation, session handling, and UI change management are core concerns.

### Entry 3

- Date: 2026-03-20
- Decision: Playwright is the required browser automation technology.
- Reason: A deterministic browser automation layer is required for browser attachment, navigation, parameter entry, and result collection.
- Consequences: Browser adapter design, testing approach, and session reuse strategy will center on Playwright.

### Entry 4

- Date: 2026-03-20
- Decision: The architecture will not use blind full-DOM brute-force crawling.
- Reason: Blind enumeration is unstable, semantically unsafe, and not maintainable for backtesting workflows.
- Consequences: Supported workflows must be modeled explicitly through templates and adapter logic.

### Entry 5

- Date: 2026-03-20
- Decision: Declarative parameter schemas are a core architectural requirement.
- Reason: The system needs deterministic control mapping, versioning, validation, and reproducibility.
- Consequences: Template management becomes a first-class subsystem and discovery mode can only generate drafts.

### Entry 6

- Date: 2026-03-20
- Decision: Semi-automatic discovery is optional and must require manual review before use.
- Reason: Discovery can accelerate maintenance, but unreviewed generated metadata is too risky for production runs.
- Consequences: Discovery output is draft-only until approved.

### Entry 7

- Date: 2026-03-20
- Decision: Experiment execution should use staged optimization instead of naive brute-force exploration.
- Reason: Full cartesian search is expensive, slow, and often wastes runs on obviously poor regions.
- Consequences: The orchestrator must support search stages, refinement, and ranking-driven progression.

### Entry 8

- Date: 2026-03-20
- Decision: The initial scaffold will use `pnpm` workspaces, Fastify, Prisma, PostgreSQL, Redis, BullMQ, React, and Docker Compose.
- Reason: The scaffold needs concrete implementation choices that fit the documented architecture and local development requirements.
- Consequences: The API app will be Fastify-based, the repository will be organized as a TypeScript monorepo, and local infrastructure will be standardized around Docker Compose.

### Entry 9

- Date: 2026-03-20
- Decision: The initial repository scaffold is split into `apps/api`, `apps/worker`, `apps/web`, `packages/shared`, `packages/config`, and root `prisma`.
- Reason: The architecture requires clear separation between API/orchestrator responsibilities, worker-owned browser automation, shared domain contracts, and persistence scaffolding.
- Consequences: Shared job payloads and domain models live in one package, Veles automation is isolated under the worker app, and future implementation work should extend these boundaries rather than bypass them.

### Entry 10

- Date: 2026-03-20
- Decision: The first real vertical slice will target one fixed Veles backtest page workflow with one reviewed template and two numeric parameters only.
- Reason: The MVP needs a narrow, auditable end-to-end flow before discovery mode, staged optimization, or broader workflow support are added.
- Consequences: The initial implementation will create and queue one concrete run per experiment, keep Veles selectors isolated in worker-owned page objects, and leave unsupported selectors/workflows as explicit TODO-marked placeholders.

### Entry 11

- Date: 2026-03-20
- Decision: The first artifact storage implementation will use local filesystem storage referenced from the database.
- Reason: The MVP needs real screenshot and snapshot capture without introducing an object-storage subsystem before the first browser flow is proven.
- Consequences: Run artifacts will be written to a local artifacts directory, persisted by metadata, and remain a future portability concern until a more formal storage layer is introduced.

### Entry 12

- Date: 2026-03-20
- Decision: The first executable experiment path will create exactly one run and enqueue `run.execute` directly from the API.
- Reason: The MVP needs a real persisted execution slice before `experiment.create`, `experiment.expand`, and staged search policy are implemented.
- Consequences: One experiment currently maps to one concrete parameter combination and one queued run; broader orchestration remains future work.

### Entry 13

- Date: 2026-03-20
- Decision: Strategy template parameters in the first slice use logical control keys while live Playwright selectors remain isolated in worker-owned page objects and the selector registry.
- Reason: The project requires declarative parameter schemas without leaking brittle Veles selectors into API, persistence, or shared domain logic.
- Consequences: Template records remain stable across selector tweaks, while live browser connectivity still depends on manually capturing the correct Veles paths and selectors in the worker registry.

### Entry 14

- Date: 2026-03-20
- Decision: The MVP will not automate Veles credential entry and will instead attach to an already authenticated Chromium-based browser session through CDP.
- Reason: The immediate goal is a reliable backtest execution slice, and manual authentication is sufficient while selectors and flow details are still being confirmed.
- Consequences: Credential env vars and login page automation are deferred, the worker now depends on `BROWSER_CDP_URL`, and local development must start a Chromium-based browser with remote debugging enabled before the worker can execute runs.

### Entry 15

- Date: 2026-03-20
- Decision: The MVP web app will use a dashboard-oriented internal tool shell with lightweight client-side path routing instead of keeping the initial scaffold landing page or adding a larger routing layer immediately.
- Reason: The immediate frontend need is a practical operator UI with stable top-level sections, while the current app only needs a handful of explicit pages and no nested data workflows yet.
- Consequences: `apps/web` should expose real top-level pages for dashboard, templates, parameter spaces, experiments, runs, and settings, while keeping route state simple and local to the frontend boundary.

### Entry 16

- Date: 2026-03-20
- Decision: Live browser-session visibility in the MVP will come from a read-only API-side CDP probe, and the first matching `veles.finance` tab will be returned when multiple matches exist.
- Reason: The UI needs real operator visibility into whether the manually prepared Veles browser session is available, but this step must not mutate tabs or trigger automation.
- Consequences: The API will expose a browser-session status endpoint, shared contracts will describe the probe result, and the dashboard can replace its placeholder browser-session state with backend-driven data.

### Entry 17

- Date: 2026-03-21
- Decision: In development, API startup should treat `EADDRINUSE` on the configured port as reusable only when that port already serves a healthy Veles Tester API instance.
- Reason: The root `pnpm dev` workflow and package-local `dev` commands may be launched while another local API watcher is already running on the same port, and that duplicate startup should not surface as a misleading failure.
- Consequences: The API bootstrap now probes `/health` on the configured port before treating `EADDRINUSE` as fatal in development; unrelated port conflicts still fail normally.

### Entry 18

- Date: 2026-03-21
- Decision: The preferred local operator workflow uses Microsoft Edge as the dedicated Chromium-based automation browser for Veles, while the dashboard may be opened in any other browser.
- Reason: The automation session needs a stable, CDP-compatible Chromium browser without disrupting the operator's normal daily browser usage.
- Consequences: Local documentation, UI copy, and backend/browser-session messaging should refer to an attached Chromium-based automation browser, recommend Edge for local automation, and avoid implying that the dashboard must share the same browser session.

### Entry 19

- Date: 2026-03-21
- Decision: The read-only browser-session probe should match the expected Veles host through configurable environment-backed probe settings instead of hardcoding a single host string in the API.
- Reason: The MVP already depends on environment-driven CDP attachment, and keeping the expected Veles host configurable preserves explicit boundaries without changing the execution architecture.
- Consequences: The API now reads `VELES_EXPECTED_HOST`, the probe still returns the first matching Veles tab for the MVP, and operator messaging stays generic to attached Chromium-based browser sessions while recommending Microsoft Edge for local automation.

---

## 24. Open Questions

- What exact normalized metric set will be considered mandatory for the first ranking implementation?
- How should profitability and robustness be weighted in the first ranking profile?
- Will the first release support only one Veles account per deployment, or multiple isolated account sessions?
- What is the preferred long-term approach for session attachment and reuse once the MVP moves beyond manually prepared authenticated browser profiles?
- What concurrency limits are safe for one Veles account without causing instability?
- How much template management belongs in the first UI release versus file-based management by developers?
- What are the exact reviewed Veles selectors and path values for the first supported backtest page, parameter inputs, run trigger, completion indicator, and metric fields?
- What exact text and units does the live Veles UI use for net profit, trade count, and max drawdown on the first supported page so the parser can be confirmed against reality?
- What is the most stable authenticated-session validation signal on the live Veles backtest page once selectors are captured?

---

## 25. Current Implementation Status

### Done

- This project context document has been created and aligned to the agreed structure.
- Core architectural direction, constraints, risks, and milestones have been documented.
- The initial implementation baseline is now confirmed as a `pnpm` monorepo with Fastify, Prisma, PostgreSQL, Redis, BullMQ, React, and Docker Compose.
- The monorepo scaffold has been created with `apps/api`, `apps/worker`, `apps/web`, `packages/shared`, `packages/config`, root `prisma`, Docker Compose, and root workspace configuration.
- Shared domain model types, parameter schema contracts, job payload types, and ranking/parser interfaces now exist in `packages/shared`.
- The API app skeleton, worker runtime skeleton, React frontend skeleton, Prisma schema draft, and environment example files now exist.
- Dedicated placeholder modules now exist for the Veles adapter, discovery mode, result parsing, and ranking engine.
- Prisma models and migration artifacts now exist for `StrategyTemplate`, `ParameterSpace`, `Experiment`, `ExperimentRun`, `RunArtifact`, and `BacktestResult` for the first executable slice.
- API endpoints now exist for creating a strategy template, creating a parameter space, creating an experiment, listing runs, and reading run details.
- The current experiment creation path now persists one experiment, creates one run, and enqueues `run.execute` directly.
- The worker now implements a real `run.execute` plus `result.parse` path for one fixed backtest workflow, including browser session handling, page-object-driven automation flow, raw payload persistence, artifact capture, metric normalization, and result persistence.
- The first supported schema now consists of two numeric parameters only: `take_profit_percent` and `stop_loss_percent`.
- Local filesystem artifact storage is now implemented for screenshots, HTML snapshots, raw execution payload JSON, and normalized metrics JSON.
- Root `.env` loading is now implemented in the API and worker apps.
- The worker now attaches to an already authenticated Chromium-based browser session through CDP and resolves an existing or newly created page inside that authenticated context.
- The environment example now includes `BROWSER_CDP_URL`, `VELES_BASE_URL`, and optional `VELES_BACKTEST_URL` for the manual-authenticated MVP flow.
- The web app now exposes a dashboard-oriented internal tool shell with a top header, left sidebar, root dashboard view, and real top-level pages for strategy templates, parameter spaces, experiments, runs, and settings.
- The API now exposes read-only system status endpoints for `/health` and `/system/browser-session`, and the dashboard now renders live API reachability plus backend-driven browser-session probe data instead of static placeholders for those two fields.
- The API now allows the local Vite web app to call backend status endpoints cross-origin in development, so the dashboard can read `http://localhost:3000/health` and `http://localhost:3000/system/browser-session` directly.
- The API dev bootstrap now detects when a healthy local API instance is already serving the configured port and skips duplicate startup in development instead of surfacing a fatal `EADDRINUSE` error.
- The local MVP workflow is now documented around a dedicated attached Chromium-based automation browser for Veles, with Microsoft Edge as the preferred local setup and the dashboard allowed to run in any browser.
- The browser-session probe now uses configurable `VELES_EXPECTED_HOST` matching and operator-facing messaging that refers to an attached Chromium-based browser session while recommending Microsoft Edge for local automation.

### Not Done

- No broad discovery mode or automatic schema extraction has been implemented.
- No staged optimization, experiment expansion, or multi-run orchestration has been implemented yet.
- No ranking calculation or ranking snapshot workflow has been implemented yet.
- The first live Veles selector/path set has not been captured yet, so the browser flow remains code-complete but not site-connected until those placeholders are replaced.
- No automated login flow exists in the MVP by design; the worker still depends on a manually prepared authenticated browser profile.
- The current session handling is single-browser and single-account only; multi-account or persisted session orchestration is still future work.

### Immediate Next Step

- Launch Microsoft Edge with remote debugging enabled for the dedicated Veles automation profile, authenticate to Veles manually in that browser, capture and verify the real backtest page selectors in `apps/worker/src/modules/veles-adapter/veles-selector-registry.ts`, and then execute one live run end to end through the attached CDP session while the dashboard remains open in any browser.

---

## 26. Rules for Maintaining This Document

- Update this file before major implementation changes.
- Never contradict this file silently.
- Mark assumptions clearly.
- Append new decisions to the Decision Log.
- Update Current Implementation Status whenever a meaningful milestone is reached.
- If code and this document diverge, treat that as a defect and resolve it explicitly.
