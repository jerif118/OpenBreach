export type TestStepDto = {
  stepId: string;
  description: string;
  expectedOutcome?: string;
};

export type TestPlanDto = {
  planId: string;
  targetId: string;
  title: string;
  status:
    | "draft"
    | "pending-approval"
    | "approved"
    | "rejected"
    | "executing"
    | "completed"
    | "cancelled";
  createdAt: string;
  steps: TestStepDto[];
  hypothesisIds?: string[];
  approver?: string;
  approvedAt?: string;
  estimatedDurationMinutes?: number;
  runId?: string;
  metadata?: Record<string, unknown>;
  stepCount: number;
};

export type TestPlanStatus =
  | "draft"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "cancelled";
