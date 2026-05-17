export type ValidationResultDto = {
  resultId: string;
  targetId: string;
  status: "passed" | "failed" | "inconclusive" | "blocked" | "error";
  executedAt: string;
  executedBy: string;
  testPlanId?: string;
  hypothesisId?: string;
  summary?: string;
  evidenceRefs?: string[];
  runId?: string;
  metadata?: Record<string, unknown>;
  findingCount: number;
};
