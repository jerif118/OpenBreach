import assert from "node:assert/strict";
import {
  approvalGateSchema,
  auditEventSchema,
  testPlanSchema,
  vulnerabilityHypothesisSchema,
  workflowRunSchema,
} from "../src/shared/contracts.ts";
import { runMvpOrchestrator } from "../src/workflow/mvp-orchestrator.ts";

const NOW = "2026-05-17T12:00:00.000Z";
const TARGET = "tgt-demo-69";
const RUN = "run-demo-69";
const ACTOR = "orchestrator-fixture";

const sampleHypothesis = vulnerabilityHypothesisSchema.parse({
  hypothesisId: "hyp-69-1",
  targetId: TARGET,
  title: "TLS configuration weakness hypothesis",
  status: "hypothesis",
  createdAt: NOW,
  proposedBy: "fixture-agent",
  description: "Fixture hypothesis for bounded test planning",
});

function baseInput(
  overrides: Partial<Parameters<typeof runMvpOrchestrator>[0]> = {},
) {
  return {
    targetId: TARGET,
    runId: RUN,
    actor: ACTOR,
    now: NOW,
    scopeApproved: true,
    passiveEvidenceComplete: true,
    fingerprintingComplete: true,
    hypothesesReady: true,
    hypotheses: [sampleHypothesis],
    ...overrides,
  };
}

function validateArtifacts(result: ReturnType<typeof runMvpOrchestrator>) {
  workflowRunSchema.parse(result.workflowRun);
  for (const ev of result.auditEvents) {
    auditEventSchema.parse(ev);
  }
  if (result.testPlan) testPlanSchema.parse(result.testPlan);
  if (result.approvalGate) approvalGateSchema.parse(result.approvalGate);
}

// 1. Rejected scope emits rejection audit and WorkflowRun rejected
{
  const r = runMvpOrchestrator(
    baseInput({
      scopeApproved: false,
      scopeRejectionReason: "ambiguous_authorization",
    }),
  );
  validateArtifacts(r);
  assert.equal(r.mvpState, "REJECTED");
  assert.equal(r.workflowRun.status, "rejected");
  assert.ok(
    r.auditEvents.some((e) => e.eventType === "workflow-rejected"),
    "scope rejection must be audited",
  );
  assert.equal(r.workflowRun.phases?.length, 1);
  assert.equal(r.workflowRun.phases?.[0]?.phase, "intake");
  assert.equal(r.workflowRun.phases?.[0]?.exitedAt, NOW);
  assert.equal(
    r.workflowRun.phases?.[0]?.rejectionReason,
    "ambiguous_authorization",
  );
  assert.equal(r.testPlan, null);
}

// 2. Halted during passive collection
{
  const r = runMvpOrchestrator(
    baseInput({
      passiveEvidenceComplete: false,
      haltRequested: true,
    }),
  );
  validateArtifacts(r);
  assert.equal(r.mvpState, "HALTED");
  assert.equal(r.workflowRun.status, "halted");
  assert.ok(r.auditEvents.some((e) => e.eventType === "workflow-halted"));
}

// 3. Passive pipeline completes at AWAITING_APPROVAL with bounded TestPlan
{
  const r = runMvpOrchestrator(baseInput());
  validateArtifacts(r);
  assert.equal(r.mvpState, "AWAITING_APPROVAL");
  assert.ok(r.testPlan);
  assert.equal(r.testPlan.status, "pending-approval");
  const meta = r.testPlan.metadata;
  assert.ok(meta && typeof meta === "object");
  assert.ok("allowedActions" in meta && meta.allowedActions);
  assert.ok("forbiddenActions" in meta && meta.forbiddenActions);
  assert.ok("maxRequestsPerMinute" in meta && meta.maxRequestsPerMinute);
  assert.ok("stopConditions" in meta && meta.stopConditions);
  assert.equal(r.approvalGate?.status, "pending");
}

// 4. Passive-only reporting completion (terminal COMPLETE via REPORTING)
{
  const r = runMvpOrchestrator(
    baseInput({ completeWithPassiveReporting: true }),
  );
  validateArtifacts(r);
  assert.equal(r.mvpState, "COMPLETE");
  assert.equal(r.workflowRun.status, "completed");
  assert.ok(r.workflowRun.completedAt);
  assert.equal(r.approvalGate?.status, "bypassed");
  assert.equal(
    r.approvalGate?.bypassJustification,
    "Passive-only reporting completed without active validation",
  );
  assert.ok(
    r.auditEvents.some((e) => e.eventType === "report-completed"),
    "passive-only reporting completion must be audited",
  );
  assert.ok(
    !r.auditEvents.some((e) => e.eventType === "gate-approved"),
    "passive-only reporting must not audit execution gate approval",
  );
}

// 5. Active validation denied without approved execution gate
{
  const r = runMvpOrchestrator(
    baseInput({
      requestActiveValidation: true,
      executionGateApproved: false,
    }),
  );
  validateArtifacts(r);
  assert.equal(r.mvpState, "AWAITING_APPROVAL");
  assert.equal(r.activeValidationDenied, true);
  assert.ok(
    r.auditEvents.some(
      (e) =>
        e.eventType === "gate-rejected" &&
        e.details?.reason ===
          "active_validation_requires_approved_execution_gate",
    ),
  );
  assert.notEqual(r.workflowRun.status, "completed");
}

// 6. Approved gate enables validation slice → COMPLETE
{
  const r = runMvpOrchestrator(
    baseInput({
      requestActiveValidation: true,
      executionGateApproved: true,
    }),
  );
  validateArtifacts(r);
  assert.equal(r.mvpState, "COMPLETE");
  assert.equal(r.workflowRun.status, "completed");
  assert.equal(r.testPlan?.status, "approved");
  assert.equal(r.approvalGate?.status, "approved");
  assert.equal(r.activeValidationDenied, false);
}

console.log("mvp-orchestrator validation: OK");
