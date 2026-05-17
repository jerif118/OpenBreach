import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type {
  DemoTargetDetailDto,
  DemoWorkflowRunSummaryDto,
} from "../../convex/types.js";
import { buildDemoTargetDetailFromFixtures } from "../lib/target-demo-fallback.ts";

// ============================================================================
// Types
// ============================================================================

export interface UseTargetDetailReturn {
  target: DemoTargetDetailDto | null;
  latestRun: DemoWorkflowRunSummaryDto | null;
  isLoading: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useTargetDetail(targetId: string): UseTargetDetailReturn {
  const isConfigured = !!import.meta.env.VITE_CONVEX_URL;

  const result = useQuery(
    api.targets.getDemo,
    isConfigured ? { targetId } : "skip",
  );

  // Fixture fallback when Convex is not configured
  if (!isConfigured) {
    const fixture = buildDemoTargetDetailFromFixtures(targetId);
    return {
      target: fixture,
      latestRun: fixture?.latestRun ?? null,
      isLoading: false,
    };
  }

  if (result === undefined) {
    return { target: null, latestRun: null, isLoading: true };
  }

  if (result === null) {
    return { target: null, latestRun: null, isLoading: false };
  }

  return {
    target: result,
    latestRun: result.latestRun ?? null,
    isLoading: false,
  };
}
