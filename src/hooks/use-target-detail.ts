import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type { TargetProfileDto } from "../../convex/types.js";

// Fixture data for demo mode when Convex is not configured
import targetApprovedPublic from "../../data/targets/target-approved-public.json";
import rejectedTarget from "../../data/targets/rejected-target.json";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Fixture mappers
// ============================================================================

function mapFixtureToTargetDetailDto(fixture: unknown): TargetDetailDto | null {
  const f = fixture as Record<string, unknown>;
  const profile = f.targetProfile
    ? (f.targetProfile as Record<string, unknown>)
    : f;

  const targetId = String(profile.targetId ?? "");
  if (!targetId) return null;

  const target: TargetDetailDto = {
    targetId,
    name: String(profile.name ?? ""),
    primaryUrl: String(profile.primaryUrl ?? ""),
    riskTier: (profile.riskTier as TargetProfileDto["riskTier"]) ?? "medium",
    classification:
      (profile.classification as TargetProfileDto["classification"]) ?? "other",
    parentOrganization: profile.parentOrganization
      ? String(profile.parentOrganization)
      : undefined,
    geography: profile.geography
      ? {
          country: String(
            (profile.geography as Record<string, unknown>).country ?? "",
          ),
          region: String(
            (profile.geography as Record<string, unknown>).region ?? "",
          ),
          city: String(
            (profile.geography as Record<string, unknown>).city ?? "",
          ),
        }
      : undefined,
    population:
      profile.population !== undefined ? Number(profile.population) : undefined,
    latitude:
      profile.latitude !== undefined ? Number(profile.latitude) : undefined,
    longitude:
      profile.longitude !== undefined ? Number(profile.longitude) : undefined,
    metadata: profile.metadata as Record<string, unknown> | undefined,
    latestRun: null,
  };

  // Map workflow run if present
  if (f.workflowRun) {
    const run = f.workflowRun as Record<string, unknown>;
    const phases = run.phases as Array<Record<string, unknown>> | undefined;
    const currentPhase =
      (run.currentPhase as string | undefined) ??
      (phases && phases.length > 0
        ? String(phases[phases.length - 1].phase ?? "")
        : undefined);

    target.latestRun = {
      runId: String(run.runId ?? ""),
      status: String(run.status ?? "pending"),
      ...(currentPhase ? { currentPhase } : {}),
    };
  }

  return target;
}

function findFixtureTarget(targetId: string): TargetDetailDto | null {
  const fixtures = [targetApprovedPublic, rejectedTarget];

  for (const fixture of fixtures) {
    const dto = mapFixtureToTargetDetailDto(fixture);
    if (dto && dto.targetId === targetId) {
      return dto;
    }
  }

  return null;
}

// ============================================================================
// Hook
// ============================================================================

export function useTargetDetail(targetId: string): UseTargetDetailReturn {
  const isConfigured = !!import.meta.env.VITE_CONVEX_URL;

  // Use conditional hook call to avoid undefined union type issues
  const result = isConfigured
    ? useQuery(api.targetsPublic.get, { targetId })
    : undefined;

  // Fixture fallback when Convex is not configured
  if (!isConfigured) {
    const fixture = findFixtureTarget(targetId);
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
