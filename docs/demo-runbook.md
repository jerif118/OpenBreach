# OpenBreach Demo Runbook

This runbook is the detailed local setup path for the hackathon demo. The safe baseline is fixture-first and credential-free: a fresh runner should be able to install dependencies, run the app locally, validate fixtures, and generate deterministic reports without Convex, Clerk, hosted deployment, browser auth, live network scans, or model-provider keys.

## Current Demo Surface

The current repository still exposes reusable municipality-oriented screens while the generic OpenBreach pivot routes are pending.

| Surface     | Current route or artifact | Notes                                                                                              |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| Dashboard   | `/`                       | Fixture-backed by default; uses Convex data only when `VITE_CONVEX_URL` is configured.             |
| Detail page | `/municipalities/$id`     | Shows risk details, findings, report links, and Clerk-aware protected-state messaging.             |
| PDF serving | `/reports/$fileName`      | Serves safe PDF filenames from `data/reports/`; invalid or missing filenames return errors.        |
| Reports     | `data/reports/`           | Committed technical/friendly PDFs and `latest.report-generation.json` support deterministic demos. |

Pending pivot surfaces such as generic target intake, authorization scope review, approval-gated validation, and generic target detail screens should be described as planned until implemented. Do not present them as current runnable routes.

## Judging Walkthrough

Use this script for a 3-5 minute presentation. The required path is local and fixture-first; live Convex, Clerk, AI provider, hosted deployment, browser auth, and network checks are optional branches only when already configured and authorized.

| Timebox   | Presenter cue                                                                                                                                         | Current repo action                                                                                                                      | Fallback or safety note                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00-0:30 | State the problem: small teams need safe visibility into public exposure without turning a demo into an intrusion tool.                               | Open this runbook and the app overview.                                                                                                  | Lead with authorization, passive defaults, and fixture-first operation.                                                                                                                    |
| 0:30-1:00 | Explain target and scope: OpenBreach starts from an approved public-facing target, allowed assets, denied assets, rate limits, and forbidden actions. | Narrate the intended OpenBreach intake and authorization gate from the README.                                                           | Current generic intake routes are pending; do not claim the current UI has those screens yet.                                                                                              |
| 1:00-1:45 | Load safe evidence: show passive observations and deterministic fixture data instead of live scanning.                                                | Run or reference `pnpm fixtures:validate`, `pnpm scanner:validate`, and the dashboard at `/`.                                            | If live network authorization is absent, skip live recon and say fixtures are the judging baseline.                                                                                        |
| 1:45-2:20 | Show hypotheses: explain that public evidence becomes security questions and risk signals, not proof of compromise.                                   | Reference `pnpm risk:validate` output and the current dashboard/detail data.                                                             | Use status words such as hypothesis, skipped, not confirmed, halted, or unresolved unless evidence supports more.                                                                          |
| 2:20-3:00 | Demonstrate the approval gate concept: a human must approve any low-impact validation before it runs.                                                 | Use the current protected-state messaging on `/municipalities/$id` and `pnpm auth:writes:validate` as the available guard demonstration. | Clerk and generic approval-gate UI are optional/pending; signed-out or fixture approval fallback is acceptable.                                                                            |
| 3:00-3:40 | Review results and limitations: show detail-page evidence, findings, report links, skipped checks, and known gaps.                                    | Open a known fixture detail route such as `/municipalities/$id`.                                                                         | Label municipality-oriented screens as current reusable surfaces while generic target detail remains pending.                                                                              |
| 3:40-4:30 | Download reports: show technical and friendly PDFs generated from structured evidence.                                                                | Use `/reports/$fileName` for a committed PDF or run `pnpm report:generate:validate`.                                                     | Use deterministic report wording when model keys are missing or provider output is unnecessary.                                                                                            |
| 4:30-5:00 | Close with the boundary and value: OpenBreach turns safe evidence into scoped remediation, not exploitation.                                          | Point to the safety checklist and skip conditions below.                                                                                 | Reiterate no exploit payloads, credential testing, brute force, fuzzing, destructive requests, private-network scanning, arbitrary third-party scanning, or unsupported compromise claims. |

### Required Fixture-First Narrative

When judges ask what happens without credentials or hosting, use this wording:

> The demo is designed to survive missing live services. We can show the full safety model with committed fixtures, deterministic report generation, fixture-backed UI, and signed-out protected-state checks. Convex, Clerk, AI-assisted wording, hosted deployment, and live recon improve realism when configured, but they are not required for judging.

### Optional Live-Service Branches

Only add these branches when the environment is already configured:

- Convex: say the same dashboard/detail surfaces can read live records when `VITE_CONVEX_URL` points at a seeded deployment.
- Clerk: show signed-out behavior first, then signed-in protected operator actions only when Clerk keys and browser auth are available.
- AI provider: describe provider-backed wording as optional polish grounded in structured findings, not a source of new facts.
- Hosted deployment: use the hosted smoke checklist only after a deployment URL exists; otherwise present local `pnpm dev` as the judging path.
- Authorized live recon: run only passive, approved checks against an owned or explicitly authorized target; skip all live checks when scope is unclear.

### Limitation Language

Use these phrases to keep the narrative accurate:

- "This is current repository behavior" for `/`, `/municipalities/$id`, `/reports/$fileName`, fixtures, and deterministic reports.
- "This is the intended OpenBreach workflow" for generic target intake, authorization review, approval-gated validation, and generic target detail until those routes are implemented.
- "This hypothesis is evidence-backed but not confirmed" for risk signals that have not been validated.
- "This check was skipped because credentials, authorization, deployment, or network access were unavailable" for optional live paths.
- "This report summarizes observed evidence and limitations" instead of claiming compromise, certification, or exhaustive coverage.

## Prerequisites

- Node.js `24.15.0`, matching `package.json`.
- pnpm `11.1.2`, matching `packageManager` in `package.json`.
- Optional Convex account and deployment for live backend sync.
- Optional Clerk application for protected operator/auth flows.
- Optional OpenRouter-compatible model-provider key for AI-assisted report wording.

## Fresh Checkout Setup

From a fresh checkout, install dependencies and start the local Vite dev server:

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. In a credential-free environment, the app should still render the fixture-backed dashboard and detail surfaces.

For a production-style local build, use the current TanStack Start/Vite scripts:

```bash
pnpm build
pnpm start
```

`pnpm build` runs `vite build` and `pnpm typecheck`. `pnpm start` serves the built Nitro output from `.output/server/index.mjs`, so run it only after a successful build.

## Provider-Neutral Deployment Notes

No selected-host configuration is present in this repository. Treat deployment as a portable TanStack Start/Nitro/Vite app: configure a Node-compatible host, run the repository build command, then serve the Nitro output with the current start command.

### Runtime And Build Contract

| Requirement     | Current value or command | Notes                                                                                                                                                                    |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node runtime    | `24.15.0`                | Match the `engines.node` pin in `package.json`. If a host cannot select this exact version, verify the deployed runtime supports the pinned dependencies before judging. |
| Package manager | `pnpm@11.1.2`            | Match `packageManager` in `package.json`.                                                                                                                                |
| Install         | `pnpm install`           | Use the lockfile in the repository.                                                                                                                                      |
| Build           | `pnpm build`             | Runs `vite build` and `pnpm typecheck`.                                                                                                                                  |
| Start           | `pnpm start`             | Runs `node .output/server/index.mjs` against the Nitro output created by the build.                                                                                      |
| Local preview   | `pnpm preview`           | Useful for local Vite preview checks, not the hosted server contract.                                                                                                    |

TanStack Start hosting guidance for Node-style deployments uses the same shape: build the app, then start the generated server output. Do not document a provider-specific adapter as required unless a matching config file is added later.

### Host Environment Variables

The fixture demo has no required hosted secrets. Add live-service variables only when the hosted demo intentionally exercises those services.

| Variable                                                     | Host visibility             | Hosted purpose                                                                        | Required for fixture-hosted demo |
| ------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| `VITE_CONVEX_URL`                                            | Client-visible              | Points the browser app at a Convex deployment for live dashboard/detail reads.        | No                               |
| `CONVEX_DEPLOYMENT`                                          | Build/tooling               | Used by Convex tooling during development or deployment.                              | No                               |
| `CONVEX_DEPLOY_KEY`                                          | Server/build secret         | Optional deploy automation key for `npx convex deploy`; never expose to browser code. | No                               |
| `VITE_CLERK_PUBLISHABLE_KEY`                                 | Client-visible              | Enables Clerk UI/provider wiring.                                                     | No                               |
| `CLERK_SECRET_KEY`                                           | Server secret               | Clerk server-side secret for protected flows when implemented/configured.             | No                               |
| `CLERK_JWT_ISSUER_DOMAIN`                                    | Server/build and Convex env | Must match the Clerk issuer configured for Convex auth.                               | No                               |
| `AI_PROVIDER_KEY`, `OPENROUTER_API_KEY`, or other model keys | Server secret               | Optional provider-backed report wording.                                              | No                               |

Configure these through the hosting provider's environment settings. Do not commit secrets, paste them into issue comments, or expose server-only keys through `VITE_` variables.

### Optional Convex Deployment

Fixture mode does not require Convex. For a live hosted demo, deploy Convex functions and seed data before expecting the hosted UI to read live records.

High-level sequence:

1. Create or select a Convex deployment.
2. Deploy Convex functions with Convex tooling, for example `npx convex deploy` in automation when a deploy key is configured.
3. Put the production Convex URL in the web host as `VITE_CONVEX_URL`.
4. Configure any Convex environment values needed by auth, including `CLERK_JWT_ISSUER_DOMAIN` when Clerk auth is enabled.
5. Seed or persist demo data with the repository scripts only when the target deployment is safe to modify.

Convex deploy automation may use `CONVEX_DEPLOY_KEY` and can run a build command as part of deployment. Keep deploy keys server-side. If Convex is absent, the app should remain on the documented fixture path.

### Optional Clerk Hosted Setup

Clerk is optional for the fixture demo and public report viewing. For a hosted auth demo:

1. Use production Clerk keys for the hosted domain.
2. Set `VITE_CLERK_PUBLISHABLE_KEY` in the host for browser provider wiring.
3. Set `CLERK_SECRET_KEY` only in server-side host environment settings.
4. Configure the hosted domain, allowed origins, and redirect URLs in the Clerk dashboard.
5. Set `CLERK_JWT_ISSUER_DOMAIN` in both the web/Convex configuration expected by `convex/auth.config.ts`.
6. Verify signed-out behavior before attempting signed-in operator flows.

Task 4 does not require authenticated browser verification because Clerk credentials and issue #10 completion are environment-dependent.

### Provider Validation Placeholders

Use these as checklists after choosing a host. They are not proof that the repository already has provider-specific deployment configuration.

| Provider family     | Validation checklist                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel-compatible   | Confirm Node `24.15.0` or compatible runtime support, install with pnpm, build with `pnpm build`, serve the Nitro output or configured framework adapter, set optional Convex/Clerk/AI variables, and run the hosted smoke checklist below.     |
| Netlify-compatible  | Confirm TanStack Start/Nitro support for the selected setup, install with pnpm, build with `pnpm build`, ensure the generated server output is served correctly, set optional live-service variables, and run the hosted smoke checklist below. |
| Generic Node/Docker | Install with pnpm, run `pnpm build`, start with `pnpm start`, expose the selected port according to the host, and configure optional live-service variables server-side.                                                                        |

If a future task adds provider config, update this section with the actual files and commands from the repository instead of replacing the provider-neutral baseline.

### Hosted Smoke Checklist

Run this only when a hosted URL exists. Otherwise mark hosted smoke as skipped and use the local fixture-first checklist.

| Check                | Hosted path or setup                                   | Expected observation                                                                                                                | Skip or fallback                                                                       |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Dashboard            | `/`                                                    | The current dashboard loads. With no `VITE_CONVEX_URL`, it uses fixture-backed data; with Convex configured, it can read live data. | Skip hosted check when no deployment URL exists. Use local `pnpm dev` instead.         |
| Detail page          | `/municipalities/$id` using a known fixture or live ID | Detail content, findings, report link, and protected-state messaging render.                                                        | Use fixture IDs locally when live Convex data is absent.                               |
| Report download      | `/reports/$fileName` for a committed safe PDF filename | The report renders or downloads; invalid names must not expose arbitrary files.                                                     | Use committed PDFs under `data/reports/` when runtime report generation is not hosted. |
| Signed-out state     | Hosted app with no active Clerk session                | Public surfaces remain readable and protected operator actions stay unavailable.                                                    | Skip signed-in checks when Clerk keys or browser auth are unavailable.                 |
| Fixture fallback     | Host without live Convex/Clerk/AI variables            | The app remains demoable from committed fixtures and deterministic reports.                                                         | If the host requires live services, use local fixture mode for judging.                |
| Optional live Convex | `VITE_CONVEX_URL` plus seeded deployment               | Dashboard/detail data can come from live Convex.                                                                                    | Skip when no deployment, seed data, auth context, or network access is available.      |

### Hosted Demo Limitations

- No hosted URL or selected provider is recorded in this repository yet.
- Live Convex, Clerk, AI provider, and signed-in browser checks depend on credentials and dashboard configuration that are unavailable by default.
- Current UI routes are still `/`, `/municipalities/$id`, and `/reports/$fileName`; generic OpenBreach target-intake and approval-gate routes remain pending until implemented.
- `data/reports/` is reliable as committed fixture/demo output. Runtime-generated report files may need durable storage on some hosts because local filesystems can be read-only or ephemeral.
- Provider logs, domains, TLS, branch previews, monitoring, and CI/CD hardening are out of scope for this hackathon runbook task.

## Fixture-First Baseline

Use these commands for deterministic validation when live services are unavailable:

```bash
pnpm pivot:validate
pnpm pivot:smoke
pnpm fixtures:validate
pnpm scanner:validate
pnpm risk:validate
pnpm report:generate:validate
pnpm dashboard:verify
pnpm auth:writes:validate
pnpm typecheck
```

`pnpm pivot:validate` is the aggregate persistence check. It runs `typecheck`, `contracts:test`, `fixtures:validate`, `auth:writes:validate`, and `pivot:smoke`. `pnpm pivot:smoke` validates the implemented Issue #65 demo contract: `targets.listDemo()`, `targets.getDemo({ targetId })`, fixture DTO parity, bounded reads, indexed detail reads, and unknown-target `null` behavior. Run `pnpm convex:codegen` only when Convex function references or generated API expectations change.

### Pivot Persistence Contract

Downstream UI and workflow tasks should consume the implemented persistence boundary instead of Convex table internals:

- Public demo reads are `targets.listDemo()` for target cards and `targets.getDemo({ targetId })` for target detail DTOs.
- Browser UI should use `useTargetList`, `useTargetDetail`, or `src/lib/target-demo-fallback.ts` outputs so live reads and fixture reads stay shape-compatible.
- When `VITE_CONVEX_URL` is absent, the hooks skip Convex reads and build deterministic DTOs from `data/targets/*.json`.
- Fixture data covers approved/rejected targets plus evidence, hypotheses, approval gates, validation results, findings, reports, technology fingerprints, test plans, and audit events.
- Scanner, orchestrator, approval, validation, finding, report, workflow, and audit writes are protected or internal mutation paths. They must derive actor identity server-side and append audit events for accepted/rejected intake and sensitive workflow changes.
- Fixture fallback is read-only. It is not fixture write-back persistence, mandatory live Convex, production authorization document storage, billing, scheduled continuous scanning, hosted deployment readiness, live scanning, generic UI implementation, or multi-tenant isolation.

Useful fixture and report generation commands:

```bash
pnpm scanner:fixture
pnpm risk:fixture
pnpm report:generate
pnpm report:generate:all
pnpm report:pdfs
pnpm report:smoke
```

Report generation writes technical and friendly PDFs under `data/reports/` and updates `data/reports/latest.report-generation.json`. The report path is deterministic by default and falls back to local template output when no model-provider key is configured or provider generation fails.

## Fixture-First Smoke Checklist

Use this checklist before a demo or judging walkthrough. The required path is deterministic and credential-free; optional live checks are skipped unless the environment is already configured and the target is authorized.

### Required Deterministic Checks

| Check                    | Command or route                | Expected observation                                                                    | Fallback or skip condition                                                                                                                      |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture dataset          | `pnpm fixtures:validate`        | Municipality fixture and seed data validate without live services.                      | Required for the fixture demo; stop and fix fixture data if this fails.                                                                         |
| Scanner/recon fixture    | `pnpm scanner:validate`         | Passive scanner fixture shape validates from local data.                                | Required for the fixture demo; do not replace with live scanning during judging.                                                                |
| Risk and hypothesis flow | `pnpm risk:validate`            | Enriched scan data produces deterministic risk output.                                  | Required for the fixture demo; describe generic vulnerability hypotheses as pending pivot behavior where current data is municipality-oriented. |
| Report generation        | `pnpm report:generate:validate` | Technical and friendly report generation validates with deterministic fallback wording. | Required for the fixture demo; provider-backed AI wording is optional.                                                                          |
| Dashboard surface        | `pnpm dashboard:verify`         | Current dashboard data, shell, map, list, and filter expectations pass.                 | Required for the current UI smoke; label it as the current reusable dashboard surface, not completed generic target intake.                     |
| Protected write guard    | `pnpm auth:writes:validate`     | Protected operator writes remain guarded when auth is unavailable.                      | Required safety check for credential-free demos.                                                                                                |

Useful local generation commands for rehearsal are:

```bash
pnpm scanner:fixture
pnpm risk:fixture
pnpm report:generate
pnpm report:smoke
```

If these commands update files under `data/`, inspect the diff before keeping it. Generated fixture or report churn is not required for a normal documentation-only smoke rehearsal.

### Current UI Route Checks

Run the app with `pnpm dev`, then check the routes that exist today:

| Route                 | Expected observation                                                                                          | Safety note                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/`                   | Fixture-backed dashboard renders without `VITE_CONVEX_URL`; filters, map, and ranked list use committed data. | Present this as the current reusable dashboard, not as completed generic target intake.                         |
| `/municipalities/$id` | Detail page renders risk details, findings, report links, and protected-state messaging.                      | Present municipality detail as the current reusable detail surface while generic target detail remains pending. |
| `/reports/$fileName`  | Safe report filenames from `data/reports/` download or render; invalid or missing names return errors.        | Do not expose arbitrary file paths or claim reports prove compromise beyond recorded evidence.                  |

Pending pivot surfaces such as generic target intake, authorization scope review, approval-gated validation, workflow runs, and generic target detail should be described as planned until corresponding routes exist.

### Optional Live Service Checks

Run these only when the required credentials, deployments, and authorization already exist. Otherwise mark them skipped, not failed.

| Optional check          | Required setup                                                                                                              | Expected observation                                                                                                                               | Skip when                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Live Convex data        | `VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`, authenticated Convex tooling, seeded data                                           | Dashboard/detail surfaces read live Convex data instead of fixtures.                                                                               | No Convex deployment, no seeded data, missing auth, or unavailable network.                                        |
| Clerk protected state   | `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` where needed, `CLERK_JWT_ISSUER_DOMAIN`, and compatible Convex auth config | Signed-out users see public surfaces and protected operator actions remain unavailable; signed-in testing may exercise configured protected paths. | No Clerk app, no authenticated browser session, no Convex auth configuration, or no need to show protected writes. |
| Provider-backed reports | `AI_PROVIDER_KEY`, `OPENROUTER_API_KEY`, or another supported provider key                                                  | Report wording may use provider output while staying grounded in structured findings.                                                              | No model-provider key, provider failure, or demo requires deterministic wording.                                   |
| Authorized live recon   | Explicit authorization for the target and network access                                                                    | Only passive, approved checks run against the authorized target.                                                                                   | No authorization, private-network target, credential testing request, or unclear scope.                            |
| Hosted smoke            | Existing deployment URL and configured environment variables                                                                | Current routes load from the hosted environment and report downloads work.                                                                         | No deployment exists or live service variables are absent.                                                         |

### Safety Checklist

Confirm these before presenting or running any optional live path:

- The target is owned by the team or explicitly authorized for demonstration.
- The required demo path uses local fixtures and deterministic report generation.
- Optional live checks are labeled optional and skipped when credentials, deployment, auth, model keys, network access, or authorization are unavailable.
- No checklist step includes exploit payloads, credential testing, brute force, fuzzing, destructive requests, private-network scanning, or arbitrary third-party scanning.
- Reports and narration describe evidence, hypotheses, and validation status without claiming confirmed compromise unless the evidence explicitly supports it.
- Pending generic OpenBreach routes and commands are described as pending, not runnable current behavior.

## Environment Variables

Copy `.env.example` only when you need optional live services:

```bash
cp .env.example .env.local
```

Do not commit `.env.local` or paste secrets into documentation, issues, logs, or screenshots.

| Variable                                            | Required for fixture demo | Optional live-service purpose                                                                                                                                 |
| --------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_CONVEX_URL`                                   | No                        | Enables the client Convex provider and live dashboard/detail reads. Client-visible because TanStack Start/Vite exposes `VITE_` variables to browser code.     |
| `CONVEX_DEPLOYMENT`                                 | No                        | Used by Convex tooling such as `pnpm convex:dev`.                                                                                                             |
| `VITE_CONVEX_SITE_URL`                              | No                        | Placeholder for Convex site URL configuration; current app code does not require it for fixture mode.                                                         |
| `VITE_CLERK_PUBLISHABLE_KEY`                        | No                        | Enables Clerk UI/provider wiring. Client-visible by design.                                                                                                   |
| `CLERK_SECRET_KEY`                                  | No                        | Clerk server-side secret for protected server/auth flows when implemented or configured. Keep server-only.                                                    |
| `CLERK_JWT_ISSUER_DOMAIN`                           | No                        | Convex Clerk JWT issuer consumed by `convex/auth.config.ts` with `applicationID: "convex"`. Configure the same value in the Convex environment for live auth. |
| `AI_PROVIDER`                                       | No                        | Documented provider selector; current report adapter uses OpenRouter behavior.                                                                                |
| `AI_PROVIDER_MODEL`                                 | No                        | Optional report model override. `.env.example` uses `anthropic/claude-sonnet-4.6`; code falls back to `anthropic/claude-sonnet-4` when unset.                 |
| `AI_PROVIDER_KEY`                                   | No                        | Generic server-side provider key for report wording.                                                                                                          |
| `OPENROUTER_API_KEY`                                | No                        | OpenRouter-specific provider key recognized by current report code.                                                                                           |
| `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` | No                        | Documented optional provider keys; not required by the current deterministic report path.                                                                     |

Scanner and persistence scripts also understand these optional runtime variables when using live or fixture-backed persistence paths:

| Variable             | Purpose                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `SCAN_FROM_FIXTURE`  | Set to `1` so `pnpm scanner:persist` reads `data/scans/latest.scan-results.json` instead of hitting the network. |
| `SCAN_FIXTURE_PATH`  | Overrides the fixture file used with `SCAN_FROM_FIXTURE=1`.                                                      |
| `MUNICIPALITY_IDS`   | Comma-separated municipality ID allowlist for live or fixture-backed scanner persistence.                        |
| `SCAN_CONCURRENCY`   | Passive scanner concurrency. Current default is `5`.                                                             |
| `SCAN_TIMEOUT_MS`    | Passive check timeout. Current default is `5000` ms.                                                             |
| `SCAN_RETRIES`       | Per-request retry count. Current default is `1`.                                                                 |
| `SCAN_DELAY_MS`      | Delay between retries. Current default is `250` ms.                                                              |
| `PERSIST_BATCH_SIZE` | Number of results forwarded per `convex run` batch. Current default is `10`.                                     |

## Optional Convex Path

Fixture mode does not require Convex. Use this path only when a Convex deployment is available:

```bash
pnpm convex:dev
pnpm convex:codegen
```

Live data setup can use the current seed and persistence scripts after Convex is configured:

```bash
pnpm municipalities:seed
SCAN_FROM_FIXTURE=1 pnpm scanner:persist
pnpm risk:persist
pnpm report:persist:fixture
```

Notes:

- `pnpm convex:dev` may require an authenticated Convex session and deployment selection.
- `pnpm convex:codegen` refreshes generated API files. Do not edit files under `convex/_generated/` by hand.
- `src/providers/app-providers.tsx` enables Convex only when `VITE_CONVEX_URL` exists. Without it, the app stays in fixture/no-provider mode.
- Persistence commands invoke Convex functions and may require live document IDs, seeded tables, or authenticated Convex context depending on the target mutation.

## Optional Clerk Path

Fixture mode and public report viewing do not require Clerk. Use Clerk only for optional protected operator flows:

1. Create or select a Clerk application.
2. Put the publishable key in `VITE_CLERK_PUBLISHABLE_KEY`.
3. Put the server secret in `CLERK_SECRET_KEY` for server-side flows.
4. Configure `CLERK_JWT_ISSUER_DOMAIN` for Convex auth and mirror it in the Convex environment.
5. Run the app with `VITE_CONVEX_URL` present when testing Clerk plus Convex together.

Current provider behavior:

- No `VITE_CLERK_PUBLISHABLE_KEY` and no `VITE_CONVEX_URL`: no providers; fixture UI remains available.
- `VITE_CONVEX_URL` only: `ConvexProvider` wraps the app.
- `VITE_CLERK_PUBLISHABLE_KEY` plus `VITE_CONVEX_URL`: `ClerkProvider` wraps `ConvexProviderWithClerk`.
- `VITE_CLERK_PUBLISHABLE_KEY` without `VITE_CONVEX_URL`: Clerk wraps the app, but Convex-backed live data remains unavailable.

## Optional AI And Mastra Report Path

There is no standalone `pnpm dev:mastra` command in the current repo. Mastra is current-code/in-process behavior used by report agents and workflows.

The report adapter checks provider keys in this order:

1. `AI_PROVIDER_KEY`
2. `OPENROUTER_API_KEY`
3. `VITE_AI_PROVIDER_KEY`

When no key is present, or provider-backed generation fails, reports use deterministic fallback templates. This is the required demo-safe behavior.

To validate report behavior without credentials:

```bash
pnpm report:generate:validate
pnpm report:smoke
```

To test provider-backed wording, configure an appropriate provider key and model, then run report generation locally. AI output must stay grounded in structured findings and must not invent findings, exploit steps, payloads, raw secrets, or certification claims.

## Pending Or Stale Commands

Do not document these as runnable current commands:

| Command                  | Status                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `pnpm dev:mastra`        | Pending/absent. Mastra is in-process report behavior.                                                     |
| `pnpm run validate:data` | Stale issue-body example; use current validators such as `pnpm fixtures:validate`.                        |
| `pnpm run seed:convex`   | Stale issue-body example; use current Convex scripts such as `pnpm municipalities:seed` where applicable. |
| `pnpm run scan:sample`   | Stale issue-body example; use `pnpm scanner:fixture` or `pnpm scanner:validate`.                          |
| `pnpm run score`         | Stale issue-body example; use `pnpm risk:fixture` or `pnpm risk:validate`.                                |
| `pnpm run reports`       | Stale issue-body example; use `pnpm report:generate` or `pnpm report:generate:validate`.                  |

## Skip Conditions

Record these as skipped, not failed, during a local or judging run:

- Live Convex checks when no deployment or `VITE_CONVEX_URL` is available.
- Clerk protected flows when no Clerk keys or authenticated browser session are available.
- Provider-backed AI wording when no model-provider key is available.
- Live network scans when network access, authorization, or owned targets are unavailable.
- Hosted smoke checks when no deployment exists.
- Pending pivot routes until the generic OpenBreach UI routes are implemented.

## Latest Fresh-Session Verification

Task 6 verified the fixture-first runbook path on 2026-05-17 06:02 UTC. The verified credential-free command set was:

```bash
pnpm fixtures:validate
pnpm scanner:validate
pnpm risk:validate
pnpm report:generate:validate
pnpm dashboard:verify
pnpm auth:writes:validate
pnpm typecheck
pnpm build
```

All commands passed. `pnpm report:generate:validate` refreshed committed report artifacts under `data/reports/`. Optional live Convex, Clerk, provider-backed AI, hosted smoke, browser-auth, long-running server, and live-recon checks were skipped because this verification did not have live credentials, deployment URL, authenticated browser session, or explicit target authorization.

See `docs/jerif118-openbreach-9-task-6-verification.md` for the full command outcomes and skip log.
