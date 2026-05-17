import type { TargetProfileDto, WorkflowRunDto } from "../../convex/types.js";
import { useOpenBreachPipeline } from "./use-openbreach-pipeline";

export interface TargetDetailLatestRun {
  runId: string;
  status: string;
  currentPhase?: string;
}

export interface TargetDetailDto extends TargetProfileDto {
  latestRun: TargetDetailLatestRun | null;
}

export interface UseTargetDetailReturn {
  target: TargetDetailDto | null;
  latestRun: TargetDetailLatestRun | null;
  isLoading: boolean;
}

function toLatestRun(run: WorkflowRunDto | null): TargetDetailLatestRun | null {
  if (!run) {
    return null;
  }

  return {
    runId: run.runId,
    status: run.status,
    currentPhase: run.currentPhase,
  };
}

export function useTargetDetail(targetId: string): UseTargetDetailReturn {
  const { isLoading, targets } = useOpenBreachPipeline();
  const target = targets.find((entry) => entry.targetId === targetId) ?? null;
  const latestRun = toLatestRun(target?.latestRun ?? null);

  if (!target) {
    return {
      target: null,
      latestRun: null,
      isLoading,
    };
  }

  return {
    target: {
      targetId: target.targetId,
      name: target.name,
      primaryUrl: target.primaryUrl,
      riskTier: target.riskTier,
      classification: target.classification,
      latestRun,
    },
    latestRun,
    isLoading,
  };
}
