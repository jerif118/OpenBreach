# Exploration: Target Intake and Authorization Gate UI (Issue 66)

## Current State

DEFF-ACC is a municipal cybersecurity risk dashboard built with React 19, TanStack Router, Convex, and Tailwind CSS v4. The app has a dark-themed UI (slate backgrounds, cyan accents) and displays a Mexico risk map with municipality rankings. Issue 65 added 12 new Convex tables including `targets`, `authorizationScopes`, `workflowRuns`, `approvalGates`, and `auditEvents` — but **no UI exists yet** for the new security-validation pivot domain.

### Existing Routes

| Route                 | File                                | Purpose                                         |
| --------------------- | ----------------------------------- | ----------------------------------------------- |
| `/`                   | `src/routes/index.tsx`              | Dashboard with risk map, ranked list, filters   |
| `/municipalities/$id` | `src/routes/municipalities.$id.tsx` | Municipality detail with scan findings, reports |
| `/reports/$fileName`  | `src/routes/reports/$fileName.ts`   | Server-side PDF download route                  |

**Router**: TanStack Router (file-based, auto-generated `routeTree.gen.ts`). No nested layouts, no route guards.

### Existing UI Architecture

- **No component library** — no `src/components/` directory exists
- **No reusable form primitives** — all UI is inline within route files
- **No modal/dialog system** — not used anywhere
- **No toast/notification system**
- **Feature-based organization**: `src/features/{domain}/` with two files:
  - `{domain}-data.ts` — state types, mock data, state transformation helpers
  - `use-{domain}.ts` — Convex query hook
- **Styling**: Tailwind CSS v4 via `@import "tailwindcss"` in `src/styles/app.css`. Custom dark theme using `bg-slate-950`, `text-slate-100`, cyan accents (`text-cyan-300`, `border-cyan-300/30`), rounded cards (`rounded-[2rem]`, `rounded-2xl`), glassmorphism (`backdrop-blur`, `bg-white/10`)

### Auth Integration

**Clerk + Convex setup** (`src/providers/app-providers.tsx`):

- `ClerkProvider` wraps `ConvexProviderWithClerk` when `VITE_CLERK_PUBLISHABLE_KEY` is set
- Graceful degradation: if Clerk key is missing, falls back to plain `ConvexProvider` or no provider
- Auth is **OPTIONAL** at runtime — the app works without it

**Role system** (`convex/auth.ts`):

- `viewer`, `operator`, `admin`
- Backend helpers: `requireAdmin`, `requireOperatorOrAdmin`, `requireApprover`, `requireAnyRole`
- Frontend: `useAuth` from `@clerk/tanstack-react-start`, `SignInButton`, `UserButton`

**Protection pattern**: Component-level, not route-level. In `municipalities.$id.tsx`, the `ProtectedOperationsPanel` shows:

- Unconfigured state (no Clerk key)
- Loading state
- Sign-in prompt (not signed in)
- Signed-in state with `UserButton`

### Current Target Display

**No UI exists for the new `targets` table.** The dashboard still queries `api.municipalities.list` and displays municipalities from the old domain. The new tables from Issue 65 (`targets`, `authorizationScopes`, etc.) only have **internal** Convex functions (`internalQuery`/`internalMutation`) — they are NOT exposed to the frontend public API yet.

### Validation Patterns

- **Zod** is used extensively in `src/shared/contracts.ts` for all domain schemas (`targetProfileSchema`, `authorizationScopeSchema`, `workflowRunSchema`, etc.)
- **No frontend form validation library** (no react-hook-form, no formik)
- **No client-side validation UI patterns** (no error message components, no field highlighting)
- URL validation uses `z.string().url()` and a custom `urlHttpsSchema` that requires `https://` prefix
- The `targetProfileSchema` has `.superRefine()` rules (e.g., population required for public-sector classification)

### Convex Patterns

- **Public queries/mutations** use `query()` / `mutation()` — exposed to frontend
- **Internal queries/mutations** use `internalQuery()` / `internalMutation()` — NOT exposed to frontend
- All new Issue 65 functions (`targets.ts`, `authorizationScopes.ts`, `workflowRuns.ts`, `approvalGates.ts`, `auditEvents.ts`) use **internal** — they need public wrappers for frontend access
- DTO mappers in each module (`toTargetProfileDto`, `toApprovalGateDto`, etc.)
- Fixture fallback pattern via `convex/lib/fixtureFallback.ts`
- State machine validation in `convex/lib/stateMachine.ts` for status transitions

### Existing Form-like Patterns

The only form-like interaction in the entire app is in `src/routes/index.tsx` — the dashboard filters:

```tsx
<select
  className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white transition outline-none focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/40"
  value={selectedRiskLevel}
  onChange={(event) => onRiskLevelChange(event.target.value as RiskLevel | "all")}
>
```

This is the ONLY `<select>`, `<input>`, or form-like element in the UI.

---

## Affected Areas

| File                              | Why It's Affected                                             |
| --------------------------------- | ------------------------------------------------------------- |
| `src/routes/`                     | New route needed for intake UI                                |
| `convex/targets.ts`               | Needs public `query`/`mutation` wrappers for frontend         |
| `convex/approvalGates.ts`         | Needs public wrappers for intake gate creation/status updates |
| `convex/authorizationScopes.ts`   | Needs public wrappers for scope creation                      |
| `convex/workflowRuns.ts`          | May need public wrappers for run creation                     |
| `src/shared/contracts.ts`         | Already has all schemas needed                                |
| `src/features/`                   | New feature directory needed for intake                       |
| `src/providers/app-providers.tsx` | Auth pattern already solid, no changes needed                 |

---

## Approaches

### Approach 1: Inline Route Page (Current Pattern)

Build the intake UI entirely inline within a new route file, following the existing municipality detail pattern.

- **Pros**: Consistent with existing codebase, no new abstractions needed, fast to implement
- **Cons**: No reusable form components, harder to maintain, duplicated form logic if intake expands to multiple steps
- **Effort**: Low

### Approach 2: Feature Module with Reusable Form Primitives

Create a new `src/features/target-intake/` with data/hook files plus a small set of reusable form components (Input, Select, FormField) in a new `src/components/ui/` directory.

- **Pros**: Scales better, establishes component reuse for future features, cleaner separation
- **Cons**: Slightly more initial setup, introduces new patterns to a codebase that currently has no components directory
- **Effort**: Medium

### Approach 3: Step Wizard with State Machine

Build a multi-step intake wizard (Target Info → Authorization Scope → Review → Submit) using the existing workflow state machine patterns.

- **Pros**: Maps well to the `intake` workflow phase, provides clear UX for a complex multi-entity creation
- **Cons**: Overkill for MVP; adds complexity; no existing wizard/stepper patterns in codebase
- **Effort**: High

---

## Recommendation

**Go with Approach 2 (Feature Module with Minimal Reusable Primitives)**.

Here's the thing — the current codebase has ZERO reusable UI components. Every route is a monolithic inline file. For the intake flow, which involves creating a target, an authorization scope, and an approval gate, we need at minimum:

- Text inputs (target name, URL)
- Select dropdowns (classification, risk tier, scope type)
- A form submission flow with validation feedback

If we inline all of this in a route file, it'll be 400+ lines of copy-pasted Tailwind classes, just like `municipalities.$id.tsx` (which is already 601 lines). That's not maintainable.

However, I don't recommend pulling in a heavy form library like react-hook-form. The project uses Zod extensively, and the schemas in `contracts.ts` are already perfect for frontend validation. We can use Zod's `.safeParse()` directly.

**Suggested minimal primitives** (3-4 components):

- `FormField` — label + input + error message with consistent styling
- `FormSelect` — label + select + error message
- `FormCard` — the existing card pattern extracted (used across dashboard, detail, and intake)
- `Button` — primary/secondary variants (the button classes are copy-pasted ~5 times already)

**New route**: `/targets/new` or `/intake` — TanStack Router file-based, so `src/routes/targets.new.tsx`

**Auth**: Use the same component-level protection pattern as `ProtectedOperationsPanel`. The intake route should be visible but show a sign-in prompt if Clerk is configured and user is not signed in. Require `operator` or `admin` role for submission.

**Convex changes needed**:

1. Add public `query`/`mutation` wrappers in `targets.ts`, `approvalGates.ts`, `authorizationScopes.ts`
2. Or create a single `targetIntake.ts` public action that orchestrates creation across all three tables

---

## Risks

1. **All new Convex functions are internal** — The frontend cannot call `targets.create`, `approvalGates.create`, etc. We MUST add public wrappers or the intake UI can't submit. This is a hard blocker.
2. **No form validation UI patterns** — We'll need to invent error display patterns (red borders, helper text). The dashboard has zero precedent for this.
3. **No mutation hooks pattern** — The existing hooks (`use-dashboard-municipalities.ts`, `use-municipality-detail.ts`) only use `useQuery`. There's no precedent for `useMutation` patterns in the frontend.
4. **Auth is optional** — The intake flow needs to handle the case where Clerk is unconfigured (development/demo mode). This means the intake UI should work in a "mock" mode similar to the dashboard.
5. **Schema mismatch risk** — `targetProfileSchema` in contracts.ts requires `targetId` to be provided, but for intake we likely want auto-generated IDs. Need to confirm if frontend generates IDs or backend does.

---

## Ready for Proposal

**Yes**, with the following clarifications needed:

1. **Should the intake flow create all three entities (Target + AuthorizationScope + ApprovalGate) in one step, or should it be a wizard?** — This affects route structure and Convex mutation design.
2. **Should intake be a single route (`/targets/new`) or split across multiple routes?** — E.g., `/intake/target`, `/intake/authorize`, `/intake/review`.
3. **Who approves the intake gate?** — The schema has `requestedBy` and `approvedBy`. Should the intake form submit a gate in `pending` status for later approval, or should it auto-approve for operators/admins?
4. **Do we need a target list view as part of this issue, or just the intake form?** — Issue 66 says "target intake and authorization gate" — is there a list/browse component too?
