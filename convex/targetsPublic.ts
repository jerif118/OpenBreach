import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type {
  TargetProfileDto,
  TargetListItemDto,
  WorkflowRunDto,
} from "./types";
import {
  isConvexConfigured,
  loadFixture,
  mapFixtureToTargetProfileDto,
} from "./lib/fixtureFallback";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

// ============================================================================
// Validation-level → scopeType mapper
// ============================================================================

function mapValidationLevel(level: string | undefined): "full" | "passive-only" | "limited" | "time-bound" {
  switch (level) {
    case "strict":
      return "limited";
    case "moderate":
      return "passive-only";
    case "permissive":
    case "full":
    default:
      return "full";
  }
}

// ============================================================================
// DTO Mappers
// ============================================================================

function toTargetProfileDto(doc: Doc<"targets">): TargetProfileDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    parentOrganization: doc.parentOrganization ?? undefined,
    geography: doc.geography
      ? {
          country: doc.geography.country,
          region: doc.geography.region,
          city: doc.geography.city,
        }
      : undefined,
    population: doc.population ?? undefined,
    latitude: doc.latitude ?? undefined,
    longitude: doc.longitude ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

function toTargetListItemDto(doc: Doc<"targets">): TargetListItemDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
  };
}

function toWorkflowRunDto(doc: Doc<"workflowRuns">): WorkflowRunDto {
  const durationMs =
    doc.completedAt || doc.abortedAt
      ? new Date(doc.completedAt ?? doc.abortedAt!).getTime() -
        new Date(doc.startedAt).getTime()
      : undefined;

  return {
    runId: doc.runId,
    targetId: doc.targetId,
    status: doc.status,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt ?? undefined,
    abortedAt: doc.abortedAt ?? undefined,
    abortedReason: doc.abortedReason ?? undefined,
    currentPhase: doc.currentPhase ?? undefined,
    phases: doc.phases
      ? doc.phases.map((p) => ({
          phase: p.phase,
          enteredAt: p.enteredAt,
          exitedAt: p.exitedAt ?? undefined,
          rejectionReason: p.rejectionReason ?? undefined,
        }))
      : undefined,
    durationMs,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `targetsPublic.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Public query: list targets as bounded DTOs.
 * Falls back to fixture data when Convex is not configured.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    // Fixture fallback for demo mode (only when Convex is not configured in browser)
    if (!isConvexConfigured()) {
      try {
        const fixture = await loadFixture<unknown>("target-approved-public");
        const dto = mapFixtureToTargetProfileDto(fixture);
        const item: TargetListItemDto = {
          targetId: dto.targetId,
          name: dto.name,
          primaryUrl: dto.primaryUrl,
          riskTier: dto.riskTier,
          classification: dto.classification,
        };
        return [item];
      } catch {
        return [] as TargetListItemDto[];
      }
    }

    const docs = await ctx.db.query("targets").take(limit);
    return docs.map(toTargetListItemDto);
  },
});

/**
 * Public query: get a single target by targetId, including latest run info.
 * Falls back to fixture data when Convex is not configured.
 */
export const get = query({
  args: { targetId: v.string() },
  handler: async (ctx, args) => {
    // Fixture fallback for demo mode
    if (!isConvexConfigured()) {
      try {
        const fixture = await loadFixture<unknown>("target-approved-public");
        const dto = mapFixtureToTargetProfileDto(fixture);
        if (dto.targetId === args.targetId) {
          return { ...dto, latestRun: null };
        }
        return null;
      } catch {
        return null;
      }
    }

    const doc = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (!doc) return null;

    const latestRun = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", doc.targetId))
      .order("desc")
      .take(1);

    return {
      ...toTargetProfileDto(doc),
      latestRun: latestRun[0]
        ? {
            runId: latestRun[0].runId,
            status: latestRun[0].status,
            currentPhase: latestRun[0].currentPhase,
          }
        : null,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Public mutation: atomic 5-insert orchestration for target intake.
 *
 * MVP: NO auth check — any user may submit.
 * Creates target + authorization scope + workflow run + approval gate + audit event
 * atomically within a single Convex transaction.
 */
export const createFull = mutation({
  args: {
    targetId: v.string(),
    name: v.string(),
    primaryUrl: v.string(),
    classification: v.union(
      v.literal("public-sector"),
      v.literal("private"),
      v.literal("infrastructure"),
      v.literal("other"),
    ),
    parentOrganization: v.optional(v.string()),
    geography: v.optional(
      v.object({
        country: v.string(),
        region: v.string(),
        city: v.string(),
      }),
    ),
    population: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
    // Optional prompt-level extras stored in metadata
    approverName: v.optional(v.string()),
    allowedAssets: v.optional(v.array(v.string())),
    deniedAssets: v.optional(v.array(v.string())),
    validationLevel: v.optional(v.string()),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = args.approverName ?? "anonymous";
    const nowISO = new Date().toISOString();

    // -----------------------------------------------------------------------
    // 1. Duplicate check
    // -----------------------------------------------------------------------
    const existing = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (existing) {
      throw new Error(`Target with targetId "${args.targetId}" already exists.`);
    }

    // -----------------------------------------------------------------------
    // 2. Merge extras into metadata
    // -----------------------------------------------------------------------
    const enrichedMetadata: Record<string, unknown> = {
      ...(args.metadata ?? {}),
      ...(args.allowedAssets ? { allowedAssets: args.allowedAssets } : {}),
      ...(args.deniedAssets ? { deniedAssets: args.deniedAssets } : {}),
      ...(args.rateLimit ? { rateLimit: args.rateLimit } : {}),
      ...(args.validationLevel ? { validationLevel: args.validationLevel } : {}),
    };

    // -----------------------------------------------------------------------
    // 3. Insert target
    // -----------------------------------------------------------------------
    await ctx.db.insert("targets", {
      targetId: args.targetId,
      name: args.name,
      primaryUrl: args.primaryUrl,
      riskTier: "medium",
      classification: args.classification,
      parentOrganization: args.parentOrganization,
      geography: args.geography,
      population: args.population,
      latitude: args.latitude,
      longitude: args.longitude,
      metadata:
        Object.keys(enrichedMetadata).length > 0 ? enrichedMetadata : undefined,
    });

    // -----------------------------------------------------------------------
    // 4. Insert authorization scope
    // -----------------------------------------------------------------------
    const scopeType = mapValidationLevel(args.validationLevel);
    await ctx.db.insert("authorizationScopes", {
      authorizationId: crypto.randomUUID(),
      targetId: args.targetId,
      scopeType,
      grantedBy: actor,
      grantedAt: nowISO,
    });

    // -----------------------------------------------------------------------
    // 5. Insert approval gate (auto-approved for MVP)
    // -----------------------------------------------------------------------
    await ctx.db.insert("approvalGates", {
      gateId: crypto.randomUUID(),
      targetId: args.targetId,
      gateType: "intake",
      status: "approved",
      requestedAt: nowISO,
      requestedBy: actor,
      approvedBy: actor,
      approvedAt: nowISO,
    });

    // -----------------------------------------------------------------------
    // 6. Insert workflow run
    // -----------------------------------------------------------------------
    const runId = crypto.randomUUID();
    await ctx.db.insert("workflowRuns", {
      runId,
      targetId: args.targetId,
      status: "pending",
      startedAt: nowISO,
      currentPhase: "intake",
      phases: [{ phase: "intake", enteredAt: nowISO }],
    });

    // -----------------------------------------------------------------------
    // 7. Insert audit event
    // -----------------------------------------------------------------------
    await ctx.db.insert("auditEvents", {
      eventId: crypto.randomUUID(),
      targetId: args.targetId,
      eventType: "target-created",
      actor,
      timestamp: nowISO,
      runId,
      details: { approver: actor, autoApproved: true },
    });

    // -----------------------------------------------------------------------
    // 8. Return DTO
    // -----------------------------------------------------------------------
    return {
      targetId: args.targetId,
      name: args.name,
      riskTier: "medium" as const,
      classification: args.classification,
      runId,
      status: "pending" as const,
      currentPhase: "intake" as const,
    };
  },
});
