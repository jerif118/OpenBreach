import type { TestPlanDto } from "./testPlans";

export type VulnerabilityHypothesisStatus =
  | "hypothesis"
  | "approved"
  | "confirmed"
  | "disproven"
  | "skipped"
  | "rejected";

export type VulnerabilityHypothesisDto = {
  hypothesisId: string;
  targetId: string;
  title: string;
  status: VulnerabilityHypothesisStatus;
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
