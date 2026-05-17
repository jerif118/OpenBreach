import type { TestPlanDto } from "./testPlans";

export type VulnerabilityHypothesisDto = {
  hypothesisId: string;
  targetId: string;
  title: string;
  status:
    | "hypothesis"
    | "approved"
    | "confirmed"
    | "disproven"
    | "skipped"
    | "rejected";
  createdAt: string;
  proposedBy: string;
  description?: string;
  cweId?: string;
  cvssScore?: number;
  affectedComponents?: string[];
  prerequisites?: string[];
  testPlanId?: string;
  runId?: string;
  metadata?: Record<string, unknown>;
  linkedTestPlan?: TestPlanDto; // deferred: populated by domain function
};

export type VulnerabilityHypothesisStatus =
  | "hypothesis"
  | "approved"
  | "confirmed"
  | "disproven"
  | "skipped"
  | "rejected";
