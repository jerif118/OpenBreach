import type {
  WorkflowRunStatus,
  ApprovalGateStatus,
  VulnerabilityHypothesisStatus,
  TestPlanStatus,
  ValidTransitionMap,
} from "../types";

// ============================================================================
// WorkflowRun State Machine
// ============================================================================

export const WORKFLOW_RUN_TRANSITIONS: ValidTransitionMap = {
  pending: ["running", "halted", "rejected"],
  running: ["paused", "completed", "halted", "rejected", "failed"],
  paused: ["running", "halted", "rejected"],
  completed: [],
  halted: [],
  rejected: [],
  failed: [],
} as const;

export const WORKFLOW_RUN_INITIAL_STATUS: WorkflowRunStatus = "pending";

// ============================================================================
// ApprovalGate State Machine
// ============================================================================

export const APPROVAL_GATE_TRANSITIONS: ValidTransitionMap = {
  pending: ["approved", "rejected", "bypassed"],
  approved: [],
  rejected: [],
  bypassed: [],
} as const;

export const APPROVAL_GATE_INITIAL_STATUS: ApprovalGateStatus = "pending";

// ============================================================================
// VulnerabilityHypothesis State Machine
// ============================================================================

export const VULNERABILITY_HYPOTHESIS_TRANSITIONS: ValidTransitionMap = {
  hypothesis: ["approved", "skipped", "rejected"],
  approved: ["confirmed", "disproven"],
  confirmed: [],
  disproven: [],
  skipped: [],
  rejected: [],
} as const;

export const VULNERABILITY_HYPOTHESIS_INITIAL_STATUS: VulnerabilityHypothesisStatus =
  "hypothesis";

// ============================================================================
// TestPlan State Machine
// ============================================================================

export const TEST_PLAN_TRANSITIONS: ValidTransitionMap = {
  draft: ["pending-approval"],
  "pending-approval": ["approved", "rejected"],
  approved: ["executing", "cancelled"],
  rejected: [],
  executing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
} as const;

export const TEST_PLAN_INITIAL_STATUS: TestPlanStatus = "draft";

// ============================================================================
// Validation Helper
// ============================================================================

export function validateTransition(
  transitions: ValidTransitionMap,
  currentStatus: string,
  nextStatus: string,
): void {
  const allowed = transitions[currentStatus];
  if (!allowed) {
    throw new Error(
      `Invalid current status "${currentStatus}". No transitions defined.`,
    );
  }
  if (!allowed.includes(nextStatus)) {
    const allowedStr = allowed.length > 0 ? allowed.join(", ") : "none (terminal)";
    throw new Error(
      `Invalid transition from "${currentStatus}" to "${nextStatus}". Allowed: [${allowedStr}].`,
    );
  }
}

// ============================================================================
// Convenience wrappers
// ============================================================================

export function validateWorkflowRunTransition(
  currentStatus: WorkflowRunStatus,
  nextStatus: WorkflowRunStatus,
): void {
  validateTransition(WORKFLOW_RUN_TRANSITIONS, currentStatus, nextStatus);
}

export function validateApprovalGateTransition(
  currentStatus: ApprovalGateStatus,
  nextStatus: ApprovalGateStatus,
): void {
  validateTransition(APPROVAL_GATE_TRANSITIONS, currentStatus, nextStatus);
}

export function validateVulnerabilityHypothesisTransition(
  currentStatus: VulnerabilityHypothesisStatus,
  nextStatus: VulnerabilityHypothesisStatus,
): void {
  validateTransition(
    VULNERABILITY_HYPOTHESIS_TRANSITIONS,
    currentStatus,
    nextStatus,
  );
}

export function validateTestPlanTransition(
  currentStatus: TestPlanStatus,
  nextStatus: TestPlanStatus,
): void {
  validateTransition(TEST_PLAN_TRANSITIONS, currentStatus, nextStatus);
}
