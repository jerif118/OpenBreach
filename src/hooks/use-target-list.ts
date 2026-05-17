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
  const result = useQuery(api.targetsPublic.list, {});

  if (result === undefined) {
    return { targets: [], isLoading: true, error: null };
  }

  return { targets: result, isLoading: false, error: null };
}
