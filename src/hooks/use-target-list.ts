import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type { DemoTargetCardDto } from "../../convex/types.js";
import { buildDemoTargetListFromFixtures } from "../lib/target-demo-fallback.ts";

// ============================================================================
// Types
// ============================================================================

export interface UseTargetListReturn {
  targets: DemoTargetCardDto[];
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useTargetList(): UseTargetListReturn {
  const isConfigured = !!import.meta.env.VITE_CONVEX_URL;
  const result = useQuery(api.targets.listDemo, isConfigured ? {} : "skip");

  if (!isConfigured) {
    return {
      targets: buildDemoTargetListFromFixtures(),
      isLoading: false,
      error: null,
    };
  }

  if (result === undefined) {
    return { targets: [], isLoading: true, error: null };
  }

  return { targets: result, isLoading: false, error: null };
}
