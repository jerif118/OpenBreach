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
} from "../convex/types";

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
} from "../src/shared/contracts.ts";

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
