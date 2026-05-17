import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type { TargetListItemDto } from "../../convex/types.js";

// Fixture data for demo mode when Convex is not configured
import targetApprovedPublic from "../../data/targets/target-approved-public.json";
import rejectedTarget from "../../data/targets/rejected-target.json";

// ============================================================================
// Types
// ============================================================================

export interface UseTargetListReturn {
  targets: TargetListItemDto[];
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// Fixture mappers
// ============================================================================

function mapFixtureToTargetListItemDto(fixture: unknown): TargetListItemDto {
  const f = fixture as Record<string, unknown>;
  const profile = f.targetProfile
    ? (f.targetProfile as Record<string, unknown>)
    : f;

  return {
    targetId: String(profile.targetId ?? ""),
    name: String(profile.name ?? ""),
    primaryUrl: String(profile.primaryUrl ?? ""),
    riskTier: (profile.riskTier as TargetListItemDto["riskTier"]) ?? "medium",
    classification:
      (profile.classification as TargetListItemDto["classification"]) ??
      "other",
  };
}

function getFixtureTargets(): TargetListItemDto[] {
  const fixtures = [targetApprovedPublic, rejectedTarget];
  return fixtures.map(mapFixtureToTargetListItemDto);
}

// ============================================================================
// Hook
// ============================================================================

export function useTargetList(): UseTargetListReturn {
  const isConfigured = !!import.meta.env.VITE_CONVEX_URL;

  // Use conditional hook call to avoid undefined union type issues
  const result = isConfigured
    ? useQuery(api.targetsPublic.list, {})
    : undefined;

  // Fixture fallback when Convex is not configured
  if (!isConfigured) {
    try {
      const fixtures = getFixtureTargets();
      return { targets: fixtures, isLoading: false, error: null };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error(String(err ?? "Unknown error"));
      return { targets: [], isLoading: false, error };
    }
  }

  if (result === undefined) {
    return { targets: [], isLoading: true, error: null };
  }

  return { targets: result, isLoading: false, error: null };
}
