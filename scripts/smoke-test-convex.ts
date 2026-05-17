/**
 * Smoke test for the Convex persistence layer DTOs and fixtures.
 *
 * This is a compile-time / structural smoke test, NOT a runtime
 * integration test against a live Convex deployment.
 *
 * Run directly:
 *   node scripts/smoke-test-convex.ts
 * Or with tsx if available:
 *   pnpm tsx scripts/smoke-test-convex.ts
 */

import type {
  TargetProfileDto,
  PassiveScanEvidenceDto,
  TechnologyFingerprintDto,
  VulnerabilityHypothesisDto,
  TestPlanDto,
  ApprovalGateDto,
  ValidationResultDto,
  FindingDto,
  AuditEventDto,
  ReportArtifactDto,
  WorkflowRunDto,
  AuthorizationScopeDto,
  DemoTargetDetailDto,
} from "../convex/types";
import fs from "node:fs";

import {
  targetProfileSchema,
  passiveScanEvidenceSchema,
  technologyFingerprintSchema,
  vulnerabilityHypothesisSchema,
  testPlanSchema,
  approvalGateSchema,
  validationResultSchema,
  findingSchema,
  auditEventSchema,
  reportArtifactSchema,
  workflowRunSchema,
  authorizationScopeSchema,
  demoTargetCardSchema,
  demoTargetDetailSchema,
} from "../src/shared/contracts.ts";
import {
  buildDemoTargetDetailFromFixtures,
  buildDemoTargetListFromFixtures,
} from "../src/lib/target-demo-fallback.ts";

// ============================================================================
// Fixture imports (dynamic to avoid hard-coding every file)
// ============================================================================

import targetApprovedPublic from "../data/targets/target-approved-public.json" with { type: "json" };
import targetRejected from "../data/targets/rejected-target.json" with { type: "json" };
import passiveEvidence from "../data/targets/passive-evidence-record.json" with { type: "json" };
import vulnerabilityHypothesis from "../data/targets/vulnerability-hypothesis.json" with { type: "json" };
import approvalGate from "../data/targets/approval-gate.json" with { type: "json" };
import validationResult from "../data/targets/validation-result.json" with { type: "json" };
import reportReadyFinding from "../data/targets/report-ready-finding.json" with { type: "json" };
import technologyFingerprint from "../data/targets/technology-fingerprint.json" with { type: "json" };
import testPlan from "../data/targets/test-plan.json" with { type: "json" };
import auditEvents from "../data/targets/audit-event.json" with { type: "json" };
import reportArtifact from "../data/targets/report-artifact.json" with { type: "json" };

// ============================================================================
// Structural type assertions (compile-time)
// ============================================================================

const _targetProfile: TargetProfileDto =
  targetApprovedPublic as TargetProfileDto;
const _passiveEvidence: PassiveScanEvidenceDto =
  passiveEvidence as unknown as PassiveScanEvidenceDto;
const _technologyFingerprint: TechnologyFingerprintDto =
  technologyFingerprint as unknown as TechnologyFingerprintDto;
const _vulnerabilityHypothesis: VulnerabilityHypothesisDto =
  vulnerabilityHypothesis as unknown as VulnerabilityHypothesisDto;
const _testPlan: TestPlanDto = testPlan as unknown as TestPlanDto;
const _approvalGate: ApprovalGateDto =
  approvalGate as unknown as ApprovalGateDto;
const _validationResult: ValidationResultDto =
  validationResult as unknown as ValidationResultDto;
const _finding: FindingDto = reportReadyFinding as unknown as FindingDto;
const _auditEvents: AuditEventDto[] = auditEvents as unknown as AuditEventDto[];
const _reportArtifact: ReportArtifactDto =
  reportArtifact as unknown as ReportArtifactDto;

// Rejected target has nested objects
const _rejectedTargetProfile: TargetProfileDto = (
  targetRejected as unknown as Record<string, unknown>
).targetProfile as unknown as TargetProfileDto;
const _rejectedApprovalGate: ApprovalGateDto = (
  targetRejected as unknown as Record<string, unknown>
).approvalGate as unknown as ApprovalGateDto;
const _rejectedWorkflowRun: WorkflowRunDto = (
  targetRejected as unknown as Record<string, unknown>
).workflowRun as unknown as WorkflowRunDto;

// ============================================================================
// Runtime Zod validation (structural)
// ============================================================================

const errors: string[] = [];

function tryValidate(label: string, schema: unknown, data: unknown) {
  try {
    (schema as { parse: (v: unknown) => unknown }).parse(data);
  } catch (e) {
    errors.push(`[FAIL] ${label}: ${String(e)}`);
  }
}

function expect(condition: boolean, message: string) {
  if (!condition) {
    errors.push(`[FAIL] ${message}`);
  }
}

function expectExactKeys(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
) {
  if (!value || typeof value !== "object") {
    errors.push(`[FAIL] ${label} must be an object`);
    return;
  }

  const actualKeys = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...expectedKeys].sort();
  expect(
    JSON.stringify(actualKeys) === JSON.stringify(expected),
    `${label} keys must match DTO contract; expected ${expected.join(", ")} got ${actualKeys.join(", ")}`,
  );
}

function expectArraySection(
  label: string,
  value: unknown,
  section: keyof DemoTargetDetailDto,
) {
  expect(
    Array.isArray((value as DemoTargetDetailDto | null)?.[section]),
    `${label}.${String(section)} must be an array for fixture/live DTO parity`,
  );
}

tryValidate(
  "target-approved-public",
  targetProfileSchema,
  targetApprovedPublic,
);
tryValidate(
  "rejected-target.profile",
  targetProfileSchema,
  (targetRejected as Record<string, unknown>).targetProfile,
);
tryValidate(
  "rejected-target.approvalGate",
  approvalGateSchema,
  (targetRejected as Record<string, unknown>).approvalGate,
);
tryValidate(
  "rejected-target.workflowRun",
  workflowRunSchema,
  (targetRejected as Record<string, unknown>).workflowRun,
);
tryValidate("passive-evidence", passiveScanEvidenceSchema, passiveEvidence);
tryValidate(
  "vulnerability-hypothesis",
  vulnerabilityHypothesisSchema,
  vulnerabilityHypothesis,
);
tryValidate("approval-gate", approvalGateSchema, approvalGate);
tryValidate("validation-result", validationResultSchema, validationResult);
tryValidate("report-ready-finding", findingSchema, reportReadyFinding);
tryValidate(
  "technology-fingerprint",
  technologyFingerprintSchema,
  technologyFingerprint,
);
tryValidate("test-plan", testPlanSchema, testPlan);

if (!Array.isArray(auditEvents)) {
  errors.push("[FAIL] audit-event.json must be an array");
} else {
  for (let i = 0; i < auditEvents.length; i++) {
    tryValidate(`audit-event[${i}]`, auditEventSchema, auditEvents[i]);
  }
}

tryValidate("report-artifact", reportArtifactSchema, reportArtifact);

const demoCards = buildDemoTargetListFromFixtures();
const approvedDemoDetail = buildDemoTargetDetailFromFixtures(
  (targetApprovedPublic as Record<string, unknown>).targetId as string,
);
const rejectedDemoDetail = buildDemoTargetDetailFromFixtures(
  (
    (targetRejected as Record<string, unknown>).targetProfile as Record<
      string,
      unknown
    >
  ).targetId as string,
);
const unknownDemoDetail = buildDemoTargetDetailFromFixtures("missing-target");
const approvedTargetId = (targetApprovedPublic as Record<string, unknown>)
  .targetId as string;
const rejectedTargetId = (
  (targetRejected as Record<string, unknown>).targetProfile as Record<
    string,
    unknown
  >
).targetId as string;

tryValidate("demo-target-cards", demoTargetCardSchema.array(), demoCards);
tryValidate(
  "demo-target-detail.approved",
  demoTargetDetailSchema,
  approvedDemoDetail,
);
tryValidate(
  "demo-target-detail.rejected",
  demoTargetDetailSchema,
  rejectedDemoDetail,
);

if (unknownDemoDetail !== null) {
  errors.push("[FAIL] demo-target-detail.unknown must return null");
}

expect(
  demoCards.some((card) => card.targetId === approvedTargetId),
  "demo-target-cards must include the approved fixture target",
);
expect(
  demoCards.some((card) => card.targetId === rejectedTargetId),
  "demo-target-cards must include the rejected fixture target",
);

for (const [label, detail] of [
  ["demo-target-detail.approved", approvedDemoDetail],
  ["demo-target-detail.rejected", rejectedDemoDetail],
] as const) {
  expectExactKeys(label, detail, [
    "target",
    "latestRun",
    "evidence",
    "hypotheses",
    "approvals",
    "validationResults",
    "findings",
    "reports",
  ]);
  for (const section of [
    "evidence",
    "hypotheses",
    "approvals",
    "validationResults",
    "findings",
    "reports",
  ] as const) {
    expectArraySection(label, detail, section);
  }
}

for (const card of demoCards) {
  expectExactKeys(`demo-target-card.${card.targetId}`, card, [
    "targetId",
    "name",
    "primaryUrl",
    "riskTier",
    "classification",
    "latestRun",
  ]);
}

const targetsSource = fs.readFileSync("convex/targets.ts", "utf-8");
if (/\.filter\s*\(/.test(targetsSource)) {
  errors.push("[FAIL] targets demo reads must not use Convex filter scans");
}
if (/\.collect\s*\(/.test(targetsSource)) {
  errors.push("[FAIL] targets demo reads must not use unbounded collect reads");
}
if (
  !/export const listDemo = query\(\{[\s\S]*returns: v\.array/.test(
    targetsSource,
  )
) {
  errors.push("[FAIL] targets.listDemo must declare a return validator");
}
if (
  !/export const getDemo = query\(\{[\s\S]*returns: v\.union/.test(
    targetsSource,
  )
) {
  errors.push("[FAIL] targets.getDemo must declare a return validator");
}
if (
  !/export const listDemo = query\(\{[\s\S]*args: targetListArgsValidator/.test(
    targetsSource,
  )
) {
  errors.push("[FAIL] targets.listDemo must declare argument validators");
}
if (
  !/export const getDemo = query\(\{[\s\S]*args: \{ targetId: v\.string\(\) \}/.test(
    targetsSource,
  )
) {
  errors.push("[FAIL] targets.getDemo must validate targetId arguments");
}

for (const snippet of [
  '.query("targets").take(limit)',
  '.query("passiveScanEvidence")\n        .withIndex("by_targetId"',
  '.query("vulnerabilityHypotheses")\n        .withIndex("by_targetId"',
  '.query("approvalGates")\n        .withIndex("by_targetId"',
  '.query("validationResults")\n        .withIndex("by_targetId"',
  '.query("findings")\n        .withIndex("by_targetId"',
  '.query("reportArtifacts")\n        .withIndex("by_targetId"',
]) {
  if (!targetsSource.includes(snippet)) {
    errors.push(
      `[FAIL] targets demo read safety check missing source pattern: ${snippet}`,
    );
  }
}

// ============================================================================
// Cross-reference integrity
// ============================================================================

const knownTargetIds = new Set<string>();
knownTargetIds.add(
  (targetApprovedPublic as Record<string, unknown>).targetId as string,
);
knownTargetIds.add(
  (
    (targetRejected as Record<string, unknown>).targetProfile as Record<
      string,
      unknown
    >
  ).targetId as string,
);

const fixturesToCheck = [
  {
    name: "passive-evidence",
    targetId: (passiveEvidence as Record<string, unknown>).targetId as string,
  },
  {
    name: "vulnerability-hypothesis",
    targetId: (vulnerabilityHypothesis as Record<string, unknown>)
      .targetId as string,
  },
  {
    name: "approval-gate",
    targetId: (approvalGate as Record<string, unknown>).targetId as string,
  },
  {
    name: "validation-result",
    targetId: (validationResult as Record<string, unknown>).targetId as string,
  },
  {
    name: "report-ready-finding",
    targetId: (reportReadyFinding as Record<string, unknown>)
      .targetId as string,
  },
  {
    name: "technology-fingerprint",
    targetId: (technologyFingerprint as Record<string, unknown>)
      .targetId as string,
  },
  {
    name: "test-plan",
    targetId: (testPlan as Record<string, unknown>).targetId as string,
  },
  {
    name: "report-artifact",
    targetId: (reportArtifact as Record<string, unknown>).targetId as string,
  },
];

for (const fixture of fixturesToCheck) {
  if (!knownTargetIds.has(fixture.targetId)) {
    errors.push(
      `[FAIL] CrossRef → ${fixture.name}.targetId '${fixture.targetId}' not found in target set`,
    );
  }
}

if (Array.isArray(auditEvents)) {
  for (let i = 0; i < auditEvents.length; i++) {
    const targetId = (auditEvents[i] as Record<string, unknown>)
      .targetId as string;
    if (!knownTargetIds.has(targetId)) {
      errors.push(
        `[FAIL] CrossRef → audit-event[${i}].targetId '${targetId}' not found in target set`,
      );
    }
  }
}

// ============================================================================
// Result
// ============================================================================

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log(
  "Smoke test passed. All DTOs compile and fixtures validate against contracts.",
);
