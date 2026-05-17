import type { WorkflowPhaseName } from "./geography";

export type WorkflowPhaseDto = {
  phase: WorkflowPhaseName;
  enteredAt: string;
  exitedAt?: string;
  rejectionReason?: string;
};

export type WorkflowRunDto = {
  runId: string;
  targetId: string;
  status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "halted"
    | "rejected"
    | "failed";
  startedAt: string;
  completedAt?: string;
  abortedAt?: string;
  abortedReason?: string;
  currentPhase?: WorkflowPhaseName;
  phases?: WorkflowPhaseDto[];
  durationMs?: number;
};

export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "halted"
  | "rejected"
  | "failed";

export type ValidTransitionMap = Record<string, readonly string[]>;
