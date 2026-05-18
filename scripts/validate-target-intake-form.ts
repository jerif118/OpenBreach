import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

import approvedFixture from "../data/targets/target-approved-public.json" with { type: "json" };
import rejectedFixture from "../data/targets/rejected-target.json" with { type: "json" };
import {
  decideTargetScope,
  deniedScopeActions,
  validationLevels,
  type ScopeDecisionInput,
  type ValidationLevel,
} from "../src/shared/target-scope-decision.ts";

const source = readFileSync(
  "src/features/target-intake/target-intake-form.tsx",
  "utf8",
);
const successCardSource = readFileSync(
  "src/features/target-intake/target-success-card.tsx",
  "utf8",
);
const hookSource = readFileSync("src/hooks/use-target-create.ts", "utf8");
const pipelineSource = readFileSync(
  "src/features/openbreach/pipeline-data.ts",
  "utf8",
);
const convexSource = readFileSync("convex/targetsPublic.ts", "utf8");
const helperSource = readFileSync(
  "src/shared/target-scope-decision.ts",
  "utf8",
);
const pdfRenderSource = readFileSync("scripts/test-pdf-render.ts", "utf8");

function sourceBetween(sourceText: string, start: string, end: string) {
  const startIndex = sourceText.indexOf(start);
  assert.ok(startIndex >= 0, `Source block start not found: ${start}`);
  const endIndex = sourceText.indexOf(end, startIndex);
  assert.ok(endIndex >= 0, `Source block end not found: ${end}`);
  return sourceText.slice(startIndex, endIndex);
}

if (source.includes('setGlobalError(\n            "[ERROR]')) {
  throw new Error(
    "Target intake connection errors must not store the [ERROR] prefix when the alert already renders it.",
  );
}

if (!source.includes("[ERROR] {globalError}")) {
  throw new Error(
    "Target intake global alert must keep a single visible [ERROR] prefix.",
  );
}

const approvedTarget = approvedFixture as {
  primaryUrl: string;
};
const rejectedTarget = rejectedFixture as {
  targetProfile: { primaryUrl: string };
  workflowRun?: { status: string; abortedReason?: string };
  auditEvents?: { eventType: string; details?: Record<string, unknown> }[];
};

function expectAcceptedDecision(
  input: ScopeDecisionInput,
  expected: {
    validationLevel: ValidationLevel;
    scopeType: "passive-only" | "limited";
    approvalRequired: boolean;
  },
) {
  const decision = decideTargetScope(input);

  assert.equal(decision.status, "accepted");
  if (decision.status !== "accepted") {
    throw new Error("Unreachable assertion narrowing failure.");
  }

  assert.equal(decision.validationLevel, expected.validationLevel);
  assert.equal(decision.scopeType, expected.scopeType);
  assert.notEqual(decision.scopeType, "full");
  assert.equal(decision.auditDecision, "accepted");
  assert.deepEqual(decision.deniedActions, deniedScopeActions);
  assert.equal(decision.approvalRequired, expected.approvalRequired);
  assert.ok(decision.allowedAssets.length > 0);
  assert.ok(
    decision.constraints.includes(
      `validation-level:${expected.validationLevel}`,
    ),
  );
  assert.ok(decision.constraints.includes(`scope-type:${expected.scopeType}`));
  assert.ok(
    decision.constraints.includes(
      `approval-required:${expected.approvalRequired}`,
    ),
  );
  assert.ok(decision.constraints.includes(`rate-limit:${decision.rateLimit}`));

  return decision;
}

function expectRejectedDecision(
  input: ScopeDecisionInput,
  expectedReason: RegExp,
) {
  const decision = decideTargetScope(input);

  assert.equal(decision.status, "rejected");
  if (decision.status !== "rejected") {
    throw new Error("Unreachable assertion narrowing failure.");
  }

  assert.equal(decision.auditDecision, "rejected");
  assert.match(decision.reason, expectedReason);
}

function assertSourceIncludesAll(
  sourceText: string,
  requiredValues: string[],
  messagePrefix: string,
) {
  for (const requiredValue of requiredValues) {
    assert.ok(
      sourceText.includes(requiredValue),
      `${messagePrefix}: ${requiredValue}`,
    );
  }
}

const defaultPassiveDecision = expectAcceptedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: [approvedTarget.primaryUrl],
  },
  {
    validationLevel: "passive",
    scopeType: "passive-only",
    approvalRequired: false,
  },
);
assert.equal(defaultPassiveDecision.rateLimit, 10);

const normalizedDecision = expectAcceptedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl.toUpperCase(),
    allowedAssets: [approvedTarget.primaryUrl],
    validationLevel: "passive",
    rateLimit: 10,
  },
  {
    validationLevel: "passive",
    scopeType: "passive-only",
    approvalRequired: false,
  },
);
assert.equal(normalizedDecision.primaryAsset.host, "www.merida.gob.mx");

for (const validationLevel of validationLevels) {
  const isPassive = validationLevel === "passive";
  const decision = expectAcceptedDecision(
    {
      primaryUrl: approvedTarget.primaryUrl,
      allowedAssets: [approvedTarget.primaryUrl],
      deniedAssets: [],
      validationLevel,
      rateLimit: 10,
    },
    {
      validationLevel,
      scopeType: isPassive ? "passive-only" : "limited",
      approvalRequired: !isPassive,
    },
  );

  if (isPassive) {
    assert.deepEqual(decision.allowedValidationClasses, ["passive-recon"]);
  } else {
    assert.ok(
      decision.allowedValidationClasses.includes("safe-metadata-checks"),
      `${validationLevel} must stay constrained to safe metadata checks before separate approval.`,
    );
  }
}

expectRejectedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: [approvedTarget.primaryUrl],
    validationLevel: "legacy-full",
  },
  /Unsupported validation level/,
);
expectRejectedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: [],
    validationLevel: "passive",
  },
  /Allowed assets must include/,
);
expectRejectedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: [approvedTarget.primaryUrl],
    deniedAssets: [approvedTarget.primaryUrl],
    validationLevel: "passive",
  },
  /explicitly denied/,
);
expectRejectedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: ["https://outside.example.org"],
    validationLevel: "passive",
  },
  /outside the submitted allowed scope/,
);
expectRejectedDecision(
  {
    primaryUrl: rejectedTarget.targetProfile.primaryUrl,
    allowedAssets: [approvedTarget.primaryUrl],
    validationLevel: "passive",
  },
  /outside the submitted allowed scope/,
);
expectRejectedDecision(
  {
    primaryUrl: "https://localhost",
    allowedAssets: ["localhost"],
    validationLevel: "passive",
  },
  /private or internal/,
);
expectRejectedDecision(
  {
    primaryUrl: "https://service.internal",
    allowedAssets: ["service.internal"],
    validationLevel: "passive",
  },
  /private or internal/,
);
expectRejectedDecision(
  {
    primaryUrl: "https://10.0.0.1",
    allowedAssets: ["10.0.0.1"],
    validationLevel: "passive",
  },
  /private or internal/,
);
expectRejectedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: ["not a host"],
    validationLevel: "passive",
  },
  /invalid asset/,
);
expectRejectedDecision(
  {
    primaryUrl: approvedTarget.primaryUrl,
    allowedAssets: [approvedTarget.primaryUrl],
    validationLevel: "passive",
    rateLimit: -1,
  },
  /Rate limit/,
);

if (convexSource.includes('return "full"')) {
  throw new Error(
    "Convex target intake must not default validation levels to full authorization.",
  );
}

const decisionIndex = convexSource.indexOf(
  "const scopeDecision = decideTargetScope",
);
const firstInsertIndex = convexSource.indexOf("ctx.db.insert");
assert.ok(decisionIndex >= 0, "Convex createFull must call decideTargetScope.");
assert.ok(
  firstInsertIndex >= 0,
  "Convex createFull insert boundary not found.",
);
assert.ok(
  decisionIndex < firstInsertIndex,
  "Convex createFull must decide/reject scope before any insert.",
);
const hookDecisionIndex = hookSource.indexOf(
  "const scopeDecision = decideTargetScope",
);
const hookDemoWriteIndex = hookSource.indexOf(
  "buildAndStoreDemoResult({ input: args, scopeDecision })",
);
assert.ok(
  hookDecisionIndex >= 0,
  "Session fallback must call decideTargetScope before writing demo target state.",
);
assert.ok(
  hookDemoWriteIndex >= 0,
  "Session fallback demo state write boundary not found.",
);
assert.ok(
  hookDecisionIndex < hookDemoWriteIndex,
  "Session fallback must decide/reject scope before writing demo target state.",
);

assert.ok(
  hookSource.includes('decision: "accepted"') &&
    hookSource.includes('decision: "rejected"'),
  "Target create hook must expose a discriminated accepted/rejected result.",
);
assertSourceIncludesAll(
  hookSource,
  [
    "authorizationScope",
    "workflowRun",
    "auditEvents",
    'eventType: "target-created"',
    'eventType: "approval-granted"',
    'eventType: "workflow-started"',
    'eventType: "target-rejected"',
    "authorizationScope: null",
    'status: "rejected"',
  ],
  "Fallback intake result must include accepted and rejected scope/workflow/audit output",
);
assertSourceIncludesAll(
  convexSource,
  [
    'decision: "accepted" as const',
    'decision: "rejected" as const',
    "authorizationScope",
    "workflowRun",
    "auditEvents",
    'eventType: "target-created"',
    'eventType: "approval-granted"',
    'eventType: "workflow-started"',
    'eventType: "target-rejected"',
    "authorizationScope: null",
  ],
  "Convex intake result must include accepted and rejected scope/workflow/audit output",
);
assert.ok(
  convexSource.includes('eventType: "target-rejected"') &&
    convexSource.includes('decision: "rejected" as const'),
  "Convex createFull must return a typed rejected result with a target-rejected audit event.",
);
assert.equal(
  convexSource.includes("throw new Error(`Target intake rejected"),
  false,
  "Expected Convex scope rejections must not throw after audit persistence.",
);
assert.ok(
  convexSource.includes("buildRejectedAuditDetails") &&
    convexSource.includes("allowedAssetCount") &&
    convexSource.includes("deniedAssetCount"),
  "Convex rejected audit details must be scalar-safe instead of copying raw arrays.",
);

const rejectedBranchSource = sourceBetween(
  convexSource,
  'if (scopeDecision.status === "rejected")',
  "// -----------------------------------------------------------------------\n    // 1. Duplicate check",
);
const rejectedWorkflowInsertIndex = rejectedBranchSource.indexOf(
  'ctx.db.insert("workflowRuns"',
);
const rejectedAuditIndex = rejectedBranchSource.indexOf("appendAuditEvent");
assert.ok(
  rejectedWorkflowInsertIndex >= 0,
  "Rejected Convex intake must persist a workflowRuns row before audit events reference the runId.",
);
assert.ok(
  rejectedAuditIndex >= 0,
  "Rejected Convex intake audit event boundary not found.",
);
assert.ok(
  rejectedWorkflowInsertIndex < rejectedAuditIndex,
  "Rejected Convex intake must persist workflowRuns before appending audit events with runId.",
);

assert.equal(
  hookSource.includes('message.includes("Convex")'),
  false,
  "Demo fallback must not hide arbitrary Convex/server errors by matching the word Convex.",
);
assert.equal(
  helperSource.includes("resolves to a private or internal host pattern"),
  false,
  "Pattern-only intake rejection copy must not claim DNS resolution happened.",
);
assert.ok(
  helperSource.includes("matches a private or internal host pattern"),
  "Pattern-only intake rejection copy must say the host matched a pattern.",
);
assert.equal(
  pdfRenderSource.includes("/Users/"),
  false,
  "PDF render test script must not write to contributor-specific absolute paths.",
);
assert.ok(
  successCardSource.includes("No audit events"),
  "Target success card must render an explicit empty state for missing audit events.",
);
assert.ok(
  pipelineSource.includes("auditEvents?: AuditEventDto[]") &&
    pipelineSource.includes("target.auditEvents ??"),
  "Session and fixture records must preserve deterministic audit event output.",
);
assert.ok(
  rejectedTarget.auditEvents?.some(
    (event) =>
      event.eventType === "target-rejected" &&
      event.details?.auditDecision === "rejected",
  ),
  "Rejected fixture must include visible rejected audit event data.",
);
assert.equal(
  rejectedTarget.workflowRun?.status,
  "rejected",
  "Rejected fixture must include a rejected workflow run for demo display.",
);
assert.ok(
  rejectedTarget.workflowRun?.abortedReason,
  "Rejected fixture workflow must include an aborted reason.",
);
assert.ok(
  successCardSource.includes("Target intake rejected") &&
    successCardSource.includes("target.auditEvents"),
  "Target intake UI must display rejected decisions and audit event data.",
);

assert.ok(
  source.includes("target-approved-public.json"),
  "Target intake form must reference the approved public fixture for one-minute demo prefill.",
);
for (const requiredPrefillField of [
  "targetId",
  "name",
  "primaryUrl",
  "classification",
  "allowedAssets",
  "validationLevel",
  "rateLimit",
  "approverName",
]) {
  assert.ok(
    source.includes(requiredPrefillField),
    `Approved fixture prefill must cover ${requiredPrefillField}.`,
  );
}
assertSourceIncludesAll(
  source,
  [
    "Load approved demo fixture",
    "fields remain editable",
    "One-minute demo path",
    "setAllowedAssets(approvedDemoFixture.primaryUrl)",
    'setValidationLevel("passive")',
  ],
  "Target intake form must expose a discoverable editable approved fixture prefill",
);
for (const safetyCopy of [
  "Passive-only",
  "Semiactive requires approval",
  "Controlled validation requires approval",
  "No scanner, fingerprinting, active validation, orchestrator, or report work starts from this screen.",
]) {
  assert.ok(
    source.includes(safetyCopy),
    `Target intake form is missing safety boundary copy: ${safetyCopy}`,
  );
}
assert.equal(
  source.includes("EXECUTE TARGET_CREATION"),
  false,
  "Submit copy must use authorization-gate language instead of target-creation execution language.",
);
assert.ok(
  source.includes("RUN INTAKE_GATE") &&
    source.includes("Resolving authorization gate"),
  "Submit and loading copy must describe intake authorization gating.",
);

for (const acceptedDisplayCopy of [
  "Approved intake scope",
  "Allowed Validation",
  "Forbidden Actions",
  "Rate Limit",
  "Approval Required",
  "Raw Constraints",
]) {
  assert.ok(
    successCardSource.includes(acceptedDisplayCopy),
    `Accepted result display is missing ${acceptedDisplayCopy}.`,
  );
}
for (const rejectedDisplayCopy of [
  "No approved scope was created.",
  "No downstream work started.",
  "target.reason",
  "target.auditEvents",
]) {
  assert.ok(
    successCardSource.includes(rejectedDisplayCopy),
    `Rejected result display is missing ${rejectedDisplayCopy}.`,
  );
}
assert.ok(
  successCardSource.includes("!isRejected &&") &&
    successCardSource.includes("Open Target Detail"),
  "Rejected result display must not expose the accepted target-detail continuation.",
);

const intakeSources = [
  source,
  successCardSource,
  hookSource,
  pipelineSource,
  convexSource,
  helperSource,
].join("\n");
for (const forbidden of [
  "runScanner",
  "startScanner",
  "fingerprintTarget",
  "runOrchestrator",
  "generateReport",
  "exploit",
  "bruteForce",
  "payloadInjection",
  "destructiveRequest",
]) {
  assert.equal(
    intakeSources.includes(forbidden),
    false,
    `Intake path must not trigger ${forbidden}.`,
  );
}

console.log("Target intake form validation passed.");
