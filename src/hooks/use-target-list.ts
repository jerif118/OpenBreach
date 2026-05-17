import type { PipelineTargetRecord } from "../features/openbreach/pipeline-data";
import { useOpenBreachPipeline } from "./use-openbreach-pipeline";

export interface UseTargetListReturn {
  targets: PipelineTargetRecord[];
  isLoading: boolean;
  error: Error | null;
}

export function useTargetList(): UseTargetListReturn {
  const { isLoading, targets } = useOpenBreachPipeline();

  return {
    targets,
    isLoading,
    error: null,
  };
}
