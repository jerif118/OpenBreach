/**
 * MVP workflow orchestrator (issue #69 OpenBreach pivot).
 * Deterministic, side-effect free: builds WorkflowRun / TestPlan / ApprovalGate / AuditEvent snapshots.
 */

import type {
  ApprovalGate,
  AuditEvent,
  TestPlan,
  VulnerabilityHypothesis,
  WorkflowPhase,
  WorkflowRun,
} from "../shared/contracts.ts";

export const MVP_WORKFLOW_STATES = [
  "INTAKE_PENDING",
  "SCOPE_APPROVED",
  "PASSIVE_RUNNING",
  "FINGERPRINTING",
  "HYPOTHESIS_GENERATION",
  "TEST_PLANNING",
  "AWAITING_APPROVAL",
  "VALIDATION_RUNNING",
  "EVIDENCE_NORMALIZATION",
  "SCORING",
  "REPORTING",
  "COMPLETE",
  "REJECTED",
  "HALTED",
] as const;

export type MvpWorkflowState = (typeof MVP_WORKFLOW_STATES)[number];

const MAX_PLANNED_STEPS = 5;

export type MvpOrchestratorInput = {
  targetId: string;
  runId: string;
  actor: string;
  now: string;
  scopeApproved: boolean;
  scopeRejectionReason?: string;
  passiveEvidenceComplete: boolean;
  fingerprintingComplete: boolean;
  hypothesesReady: boolean;
  hypotheses: VulnerabilityHypothesis[];
  haltRequested?: boolean;
  /** After passive pipeline: emit passive-only report and complete (skips waiting at approval). */
  completeWithPassiveReporting?: boolean;
  /** Attempt to enter active validation from AWAITING_APPROVAL */
  requestActiveValidation?: boolean;
  /** When validation is requested, both execution gate and implicit test-plan approval are required. */
  executionGateApproved?: boolean;
};

export type MvpOrchestratorResult = {
  mvpState: MvpWorkflowState;
  workflowRun: WorkflowRun;
  auditEvents: AuditEvent[];
  testPlan: TestPlan | null;
  approvalGate: ApprovalGate | null;
  /** True when validation was requested without an approved execution gate */
  activeValidationDenied: boolean;
};

function phaseEntry(
  phase: WorkflowPhase["phase"],
  enteredAt: string,
  rejectionReason?: string,
): WorkflowPhase {
  return { phase, enteredAt, rejectionReason };
}

function exitLastPhase(phases: WorkflowPhase[], exitedAt: string): void {
  const last = phases.at(-1);
  if (last && !last.exitedAt) last.exitedAt = exitedAt;
}

function pushPhase(
  phases: WorkflowPhase[],
  phase: WorkflowPhase["phase"],
  enteredAt: string,
): void {
  exitLastPhase(phases, enteredAt);
  phases.push(phaseEntry(phase, enteredAt));
}

/** Maps MVP orchestration milestones onto persisted WorkflowRun.phase vocabulary. */
export function mvpStateToWorkflowPhase(
  state: MvpWorkflowState,
): WorkflowPhase["phase"] | undefined {
  switch (state) {
    case "INTAKE_PENDING":
      return "intake";
    case "SCOPE_APPROVED":
    case "PASSIVE_RUNNING":
      return "passive-scan";
    case "FINGERPRINTING":
    case "HYPOTHESIS_GENERATION":
      return "hypothesis";
    case "TEST_PLANNING":
      return "test-planning";
    case "AWAITING_APPROVAL":
      return "approval";
    case "VALIDATION_RUNNING":
    case "EVIDENCE_NORMALIZATION":
    case "SCORING":
      return "validation";
    case "REPORTING":
    case "COMPLETE":
      return "reporting";
    case "REJECTED":
      return "intake";
    case "HALTED":
      return undefined;
    default:
      return undefined;
  }
}

export function buildBoundedTestPlan(params: {
  targetId: string;
  runId: string;
  now: string;
  hypotheses: VulnerabilityHypothesis[];
}): TestPlan {
  const planId = `${params.runId}-plan`;
  const picked = params.hypotheses.slice(0, MAX_PLANNED_STEPS);
  const steps =
    picked.length > 0
      ? picked.map((h, i) => ({
          stepId: `${planId}-step-${i + 1}`,
          description: `Bounded validation aligned to hypothesis: ${h.title}`,
          expectedOutcome: `Correlated evidence for ${h.hypothesisId}`,
        }))
      : [
          {
            stepId: `${planId}-step-placeholder`,
            description:
              "Passive-only confirmation step when no hypotheses are available",
            expectedOutcome: "Baseline passive evidence captured",
          },
        ];

  return {
    planId,
    targetId: params.targetId,
    title: "MVP bounded validation plan",
    status: "pending-approval",
    createdAt: params.now,
    steps,
    hypothesisIds: picked.map((h) => h.hypothesisId),
    runId: params.runId,
    metadata: {
      allowedActions: [
        "GET",
        "HEAD",
        "tls_inspection",
        "timing_safe_probe",
      ],
      forbiddenActions: [
        "exploit",
        "credential_stuffing",
        "destructive_mutation",
        "data_exfiltration",
      ],
      maxRequestsPerMinute: 30,
      stopConditions: [
        "scope_boundary_reached",
        "rate_budget_exhausted",
        "unexpected_auth_wall",
        "operator_halt_signal",
      ],
      expectedEvidence: [
        "normalized_headers",
        "tls_cert_summary",
        "passive_timing_samples",
      ],
      riskOfImpact: "low_touch_within_declared_scope",
      validationClasses: ["authorized_low_impact_only"],
    },
  };
}

function approvedExecutionGate(
  base: Omit<ApprovalGate, "status" | "approvedBy" | "approvedAt">,
  now: string,
  actor: string,
): ApprovalGate {
  return {
    ...base,
    status: "approved",
    approvedBy: actor,
    approvedAt: now,
  };
}

function pendingExecutionGate(
  base: Omit<ApprovalGate, "status" | "approvedBy" | "approvedAt">,
): ApprovalGate {
  return {
    ...base,
    status: "pending",
  };
}

/**
 * Derives orchestrator outputs from a single fixture snapshot.
 */
export function runMvpOrchestrator(
  input: MvpOrchestratorInput,
): MvpOrchestratorResult {
  const audits: AuditEvent[] = [];
  let seq = 0;
  const audit = (
    eventType: AuditEvent["eventType"],
    details?: Record<string, string | number | boolean | null>,
  ) => {
    audits.push({
      eventId: `${input.runId}-audit-${seq++}`,
      targetId: input.targetId,
      eventType,
      actor: input.actor,
      timestamp: input.now,
      runId: input.runId,
      details,
    });
  };

  audit("workflow-started");
  audit("workflow-pending");

  const phases: WorkflowPhase[] = [phaseEntry("intake", input.now)];

  if (!input.scopeApproved) {
    audit("workflow-rejected", { reason: "scope_not_approved" });
    exitLastPhase(phases, input.now);
    phases.push(
      phaseEntry("intake", input.now, input.scopeRejectionReason ?? "scope_denied"),
    );
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "rejected",
      startedAt: input.now,
      abortedAt: input.now,
      abortedReason:
        input.scopeRejectionReason ?? "Authorization scope not approved",
      currentPhase: "intake",
      phases,
    };
    return {
      mvpState: "REJECTED",
      workflowRun,
      auditEvents: audits,
      testPlan: null,
      approvalGate: null,
      activeValidationDenied: false,
    };
  }

  audit("workflow-running");
  audit("phase-changed", { from: "intake", to: "passive-scan" });
  exitLastPhase(phases, input.now);
  pushPhase(phases, "passive-scan", input.now);

  if (input.haltRequested) {
    audit("workflow-halted", { stage: "passive_collection" });
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "halted",
      startedAt: input.now,
      abortedAt: input.now,
      abortedReason: "operator_or_policy_halt",
      currentPhase: "passive-scan",
      phases,
    };
    return {
      mvpState: "HALTED",
      workflowRun,
      auditEvents: audits,
      testPlan: null,
      approvalGate: null,
      activeValidationDenied: false,
    };
  }

  let mvpState: MvpWorkflowState = "PASSIVE_RUNNING";
  if (!input.passiveEvidenceComplete) {
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "running",
      startedAt: input.now,
      currentPhase: "passive-scan",
      phases,
    };
    return {
      mvpState,
      workflowRun,
      auditEvents: audits,
      testPlan: null,
      approvalGate: null,
      activeValidationDenied: false,
    };
  }

  audit("phase-changed", { from: "passive-scan", to: "hypothesis" });
  exitLastPhase(phases, input.now);
  pushPhase(phases, "hypothesis", input.now);

  mvpState = "FINGERPRINTING";
  if (!input.fingerprintingComplete) {
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "running",
      startedAt: input.now,
      currentPhase: "hypothesis",
      phases,
    };
    return {
      mvpState,
      workflowRun,
      auditEvents: audits,
      testPlan: null,
      approvalGate: null,
      activeValidationDenied: false,
    };
  }

  mvpState = "HYPOTHESIS_GENERATION";
  if (!input.hypothesesReady) {
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "running",
      startedAt: input.now,
      currentPhase: "hypothesis",
      phases,
    };
    return {
      mvpState,
      workflowRun,
      auditEvents: audits,
      testPlan: null,
      approvalGate: null,
      activeValidationDenied: false,
    };
  }

  audit("hypothesis-proposed", { count: input.hypotheses.length });
  audit("phase-changed", { from: "hypothesis", to: "test-planning" });
  exitLastPhase(phases, input.now);
  pushPhase(phases, "test-planning", input.now);

  const testPlan = buildBoundedTestPlan({
    targetId: input.targetId,
    runId: input.runId,
    now: input.now,
    hypotheses: input.hypotheses,
  });

  audit("phase-changed", { from: "test-planning", to: "approval" });
  exitLastPhase(phases, input.now);
  pushPhase(phases, "approval", input.now);

  mvpState = "AWAITING_APPROVAL";

  const gateBase = {
    gateId: `${input.runId}-exec-gate`,
    targetId: input.targetId,
    gateType: "execution" as const,
    requestedAt: input.now,
    requestedBy: input.actor,
    linkedArtifactId: testPlan.planId,
    runId: input.runId,
  };

  let approvalGate: ApprovalGate = pendingExecutionGate(gateBase);
  audit("approval-requested", { gateId: approvalGate.gateId });

  let activeValidationDenied = false;

  if (input.completeWithPassiveReporting) {
    audit("gate-approved", { mode: "passive_reporting_short_circuit" });
    approvalGate = approvedExecutionGate(gateBase, input.now, input.actor);
    audit("phase-changed", { from: "approval", to: "reporting" });
    exitLastPhase(phases, input.now);
    pushPhase(phases, "reporting", input.now);
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "completed",
      startedAt: input.now,
      completedAt: input.now,
      currentPhase: "reporting",
      phases,
    };
    audit("workflow-completed");
    audit("report-completed");
    return {
      mvpState: "COMPLETE",
      workflowRun,
      auditEvents: audits,
      testPlan,
      approvalGate,
      activeValidationDenied: false,
    };
  }

  if (input.requestActiveValidation && !input.executionGateApproved) {
    audit("gate-rejected", {
      reason: "active_validation_requires_approved_execution_gate",
    });
    activeValidationDenied = true;
    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "running",
      startedAt: input.now,
      currentPhase: "approval",
      phases,
    };
    return {
      mvpState: "AWAITING_APPROVAL",
      workflowRun,
      auditEvents: audits,
      testPlan,
      approvalGate,
      activeValidationDenied,
    };
  }

  if (input.requestActiveValidation && input.executionGateApproved) {
    approvalGate = approvedExecutionGate(gateBase, input.now, input.actor);
    audit("gate-approved", { gateId: approvalGate.gateId });
    audit("approval-granted", { gateId: approvalGate.gateId });

    const approvedPlan: TestPlan = {
      ...testPlan,
      status: "approved",
      approver: input.actor,
      approvedAt: input.now,
    };

    audit("phase-changed", { from: "approval", to: "validation" });
    exitLastPhase(phases, input.now);
    pushPhase(phases, "validation", input.now);
    audit("validation-recorded", { phase: "VALIDATION_RUNNING" });
    audit("validation-recorded", { phase: "EVIDENCE_NORMALIZATION" });
    audit("validation-recorded", { phase: "SCORING" });

    audit("phase-changed", { from: "validation", to: "reporting" });
    exitLastPhase(phases, input.now);
    pushPhase(phases, "reporting", input.now);
    audit("report-generated");
    audit("report-completed");

    const workflowRun: WorkflowRun = {
      runId: input.runId,
      targetId: input.targetId,
      status: "completed",
      startedAt: input.now,
      completedAt: input.now,
      currentPhase: "reporting",
      phases,
    };
    audit("workflow-completed");

    return {
      mvpState: "COMPLETE",
      workflowRun,
      auditEvents: audits,
      testPlan: approvedPlan,
      approvalGate,
      activeValidationDenied: false,
    };
  }

  const workflowRun: WorkflowRun = {
    runId: input.runId,
    targetId: input.targetId,
    status: "running",
    startedAt: input.now,
    currentPhase: "approval",
    phases,
  };

  return {
    mvpState,
    workflowRun,
    auditEvents: audits,
    testPlan,
    approvalGate,
    activeValidationDenied,
  };
}
