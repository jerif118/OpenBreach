import { readFileSync } from "node:fs";

const authSource = readFileSync("convex/auth.ts", "utf8");
const municipalitiesSource = readFileSync("convex/municipalities.ts", "utf8");
const reportsSource = readFileSync("convex/reports.ts", "utf8");
const rawScanResultsSource = readFileSync("convex/rawScanResults.ts", "utf8");
const scanResultsSource = readFileSync("convex/scanResults.ts", "utf8");
const usersSource = readFileSync("convex/users.ts", "utf8");
const authConfigSource = readFileSync("convex/auth.config.ts", "utf8");
const targetsPublicSource = readFileSync("convex/targetsPublic.ts", "utf8");
const workflowRunsSource = readFileSync("convex/workflowRuns.ts", "utf8");
const passiveScanEvidenceSource = readFileSync(
  "convex/passiveScanEvidence.ts",
  "utf8",
);
const approvalGatesSource = readFileSync("convex/approvalGates.ts", "utf8");
const validationResultsSource = readFileSync(
  "convex/validationResults.ts",
  "utf8",
);
const findingsSource = readFileSync("convex/findings.ts", "utf8");
const reportArtifactsSource = readFileSync("convex/reportArtifacts.ts", "utf8");
const auditEventsSource = readFileSync("convex/auditEvents.ts", "utf8");

const requiredAuthSnippets = [
  "ctx.auth.getUserIdentity()",
  "identity.tokenIdentifier",
  '.withIndex("by_tokenIdentifier"',
  "requireAnyRole",
  "requireAdmin",
  "requireOperatorOrAdmin",
];

for (const snippet of requiredAuthSnippets) {
  if (!authSource.includes(snippet)) {
    throw new Error(
      `Auth helper is missing required role lookup behavior: ${snippet}`,
    );
  }
}

// municipalities.seed is an internalMutation: it is not reachable from the
// public client surface, so it does not need an additional `requireAdmin`
// runtime check. This matches the pattern used by rawScanResults.upsertMany
// and scanResults.upsertEnrichedMany below.
if (!municipalitiesSource.includes("export const seed = internalMutation")) {
  throw new Error(
    "municipalities.seed must remain internal-only unless a protected public wrapper is added.",
  );
}

for (const mutationName of ["persistGenerated", "createPlaceholder"]) {
  const mutationMatch = reportsSource.match(
    new RegExp(`export const ${mutationName} = mutation\\([\\s\\S]*?\\n}\\);`),
  );
  if (!mutationMatch) {
    throw new Error(`reports.${mutationName} mutation must exist.`);
  }

  if (!mutationMatch[0].includes("await requireOperatorOrAdmin(ctx)")) {
    throw new Error(
      `reports.${mutationName} must require operator or admin role authorization.`,
    );
  }
}

if (
  !rawScanResultsSource.includes("export const upsertMany = internalMutation")
) {
  throw new Error(
    "rawScanResults.upsertMany must remain internal-only unless a protected public wrapper is added.",
  );
}

if (
  !scanResultsSource.includes(
    "export const upsertEnrichedMany = internalMutation",
  )
) {
  throw new Error(
    "scanResults.upsertEnrichedMany must remain internal-only unless a protected public wrapper is added.",
  );
}

if (
  !usersSource.includes("export const current = query") ||
  !usersSource.includes("getCurrentUserProfile(ctx)")
) {
  throw new Error(
    "users.current must expose server-derived current profile lookup.",
  );
}

if (
  !usersSource.includes("export const setRoles = mutation") ||
  !usersSource.includes("await requireAdmin(ctx)")
) {
  throw new Error(
    "users.setRoles must require admin authorization for profile role administration.",
  );
}

const protectedSources = [municipalitiesSource, reportsSource, usersSource];
for (const forbiddenSnippet of [
  "userId: v.",
  "userIdentifier: v.",
  "clerkUserId: v.",
]) {
  if (protectedSources.some((source) => source.includes(forbiddenSnippet))) {
    throw new Error(
      `Protected writes must not accept client-supplied authorization identifiers: ${forbiddenSnippet}`,
    );
  }
}

const protectedIntakeMatch = targetsPublicSource.match(
  /export const createFull = mutation\([\s\S]*?\n}\);/,
);
if (!protectedIntakeMatch) {
  throw new Error(
    "targetsPublic.createFull protected intake mutation must exist.",
  );
}

for (const snippet of [
  "ctx.auth.getUserIdentity()",
  "identity.tokenIdentifier",
  "await requireOperatorOrAdmin(ctx)",
]) {
  if (!protectedIntakeMatch[0].includes(snippet)) {
    throw new Error(
      `targetsPublic.createFull must derive and authorize server identity: ${snippet}`,
    );
  }
}

if (
  protectedIntakeMatch[0].includes("args.approverName") ||
  protectedIntakeMatch[0].includes('"anonymous"')
) {
  throw new Error(
    "targetsPublic.createFull must not trust client approverName or anonymous actors for audit attribution.",
  );
}

const sensitiveInternalExports: Array<[string, string, string]> = [
  ["workflowRuns", workflowRunsSource, "create"],
  ["workflowRuns", workflowRunsSource, "updatePhase"],
  ["workflowRuns", workflowRunsSource, "updateStatus"],
  ["passiveScanEvidence", passiveScanEvidenceSource, "upsert"],
  ["approvalGates", approvalGatesSource, "create"],
  ["approvalGates", approvalGatesSource, "updateStatus"],
  ["validationResults", validationResultsSource, "create"],
  ["findings", findingsSource, "create"],
  ["findings", findingsSource, "update"],
  ["reportArtifacts", reportArtifactsSource, "create"],
  ["reportArtifacts", reportArtifactsSource, "complete"],
  ["auditEvents", auditEventsSource, "append"],
];

const sensitiveWriteModules: Array<[string, string]> = [
  ["workflowRuns", workflowRunsSource],
  ["passiveScanEvidence", passiveScanEvidenceSource],
  ["approvalGates", approvalGatesSource],
  ["validationResults", validationResultsSource],
  ["findings", findingsSource],
  ["reportArtifacts", reportArtifactsSource],
  ["auditEvents", auditEventsSource],
];

for (const [moduleName, source] of sensitiveWriteModules) {
  const publicMutationMatch = source.match(/export const \w+ = mutation\(/);
  if (publicMutationMatch) {
    throw new Error(
      `${moduleName} must not expose sensitive workflow writes as public mutations: ${publicMutationMatch[0]}`,
    );
  }
}

for (const [moduleName, source, exportName] of sensitiveInternalExports) {
  if (!source.includes(`export const ${exportName} = internalMutation`)) {
    throw new Error(
      `${moduleName}.${exportName} must remain internal-only unless a protected public wrapper is added.`,
    );
  }
}

const protectedWriteSources = [
  targetsPublicSource,
  workflowRunsSource,
  passiveScanEvidenceSource,
  approvalGatesSource,
  validationResultsSource,
  findingsSource,
  reportArtifactsSource,
];
for (const forbiddenSnippet of [
  "userId: v.",
  "userIdentifier: v.",
  "clerkUserId: v.",
  "tokenIdentifier: v.",
]) {
  if (
    protectedWriteSources.some((source) => source.includes(forbiddenSnippet))
  ) {
    throw new Error(
      `Task 4 writes must not accept client-supplied authorization identifiers: ${forbiddenSnippet}`,
    );
  }
}

for (const snippet of [
  "validateWorkflowRunTransition(doc.status, args.status)",
  "validateApprovalGateTransition(doc.status, args.status)",
]) {
  if (
    ![workflowRunsSource, approvalGatesSource].some((source) =>
      source.includes(snippet),
    )
  ) {
    throw new Error(`State transition validation is missing: ${snippet}`);
  }
}

const auditCoverage: Array<[string, string, string[]]> = [
  [
    "targetsPublic.createFull",
    targetsPublicSource,
    ["target-created", "approval-granted", "workflow-started"],
  ],
  ["workflowRuns.create", workflowRunsSource, ["workflow-started"]],
  ["workflowRuns.updatePhase", workflowRunsSource, ["phase-changed"]],
  [
    "workflowRuns.updateStatus",
    workflowRunsSource,
    ["workflow-completed", "workflow-halted"],
  ],
  [
    "passiveScanEvidence.upsert",
    passiveScanEvidenceSource,
    ["evidence-recorded"],
  ],
  ["approvalGates.create", approvalGatesSource, ["approval-requested"]],
  [
    "approvalGates.updateStatus",
    approvalGatesSource,
    ["approval-granted", "approval-rejected", "manual-override"],
  ],
  [
    "validationResults.create",
    validationResultsSource,
    ["validation-recorded"],
  ],
  ["findings.create", findingsSource, ["finding-created"]],
  ["findings.update", findingsSource, ["finding-updated"]],
  ["reportArtifacts.create", reportArtifactsSource, ["report-generated"]],
  ["reportArtifacts.complete", reportArtifactsSource, ["report-completed"]],
];

for (const [label, source, eventTypes] of auditCoverage) {
  if (!source.includes("appendAuditEvent")) {
    throw new Error(`${label} must append a sanitized audit event.`);
  }
  for (const eventType of eventTypes) {
    if (!source.includes(eventType)) {
      throw new Error(`${label} audit coverage is missing ${eventType}.`);
    }
  }
}

if (
  auditEventsSource.includes("await requireOperatorOrAdmin(ctx)") ||
  !auditEventsSource.includes("appendAuditEvent")
) {
  throw new Error(
    "auditEvents.append must be internal-only and usable by authorized internal system callers without re-checking Clerk auth.",
  );
}

for (const source of protectedWriteSources) {
  for (const forbiddenDetail of ["headers", "metadata", "raw", "token"]) {
    if (source.includes(`details: args.${forbiddenDetail}`)) {
      throw new Error(
        `Audit details must stay sanitized and bounded; found direct ${forbiddenDetail} details copy.`,
      );
    }
  }
}

// The Clerk provider must keep its Convex applicationID and read the issuer
// domain from the environment so each deployment (dev, prod, fixture) can wire
// a different Clerk instance without code changes. See README.md > Environment.
if (
  !authConfigSource.includes('applicationID: "convex"') ||
  !authConfigSource.includes("process.env.CLERK_JWT_ISSUER_DOMAIN")
) {
  throw new Error(
    "Convex auth config must retain the Clerk provider shape for environment-specific issuer setup.",
  );
}

console.log("Auth write validation passed.");
