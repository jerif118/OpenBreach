import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOperatorOrAdmin } from "./auth";
import { appendAuditEvent } from "./lib/audit";

// ============================================================================
// Validation-level → scopeType mapper
// ============================================================================

function mapValidationLevel(
  level: string | undefined,
): "full" | "passive-only" | "limited" | "time-bound" {
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
// Mutations
// ============================================================================

/**
 * Protected public mutation: atomic target intake orchestration.
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required.");
    }
    const profile = await requireOperatorOrAdmin(ctx);
    const actor = profile.name ?? identity.tokenIdentifier;
    const nowISO = new Date().toISOString();

    // -----------------------------------------------------------------------
    // 1. Duplicate check
    // -----------------------------------------------------------------------
    const existing = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (existing) {
      throw new Error(
        `Target with targetId "${args.targetId}" already exists.`,
      );
    }

    // -----------------------------------------------------------------------
    // 2. Merge extras into metadata
    // -----------------------------------------------------------------------
    const enrichedMetadata: Record<string, unknown> = {
      ...(args.metadata ?? {}),
      ...(args.allowedAssets ? { allowedAssets: args.allowedAssets } : {}),
      ...(args.deniedAssets ? { deniedAssets: args.deniedAssets } : {}),
      ...(args.rateLimit ? { rateLimit: args.rateLimit } : {}),
      ...(args.validationLevel
        ? { validationLevel: args.validationLevel }
        : {}),
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
    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "target-created",
      actor,
      runId,
      details: { approver: actor, autoApproved: true },
    });

    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "approval-granted",
      actor,
      runId,
      details: { gateType: "intake", autoApproved: true },
    });

    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "workflow-started",
      actor,
      runId,
      details: { phase: "intake", status: "pending" },
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
