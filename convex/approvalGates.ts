import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin, requireApprover, requireAdmin } from "./auth";
import type { ApprovalGateDto } from "./types";
import { validateApprovalGateTransition } from "./lib/stateMachine";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toApprovalGateDto(doc: Doc<"approvalGates">): ApprovalGateDto {
  return {
    gateId: doc.gateId,
    targetId: doc.targetId,
    gateType: doc.gateType,
    status: doc.status,
    requestedAt: doc.requestedAt,
    requestedBy: doc.requestedBy,
    approvedBy: doc.approvedBy ?? undefined,
    approvedAt: doc.approvedAt ?? undefined,
    rejectionReason: doc.rejectionReason ?? undefined,
    bypassJustification: doc.bypassJustification ?? undefined,
    linkedArtifactId: doc.linkedArtifactId ?? undefined,
    runId: doc.runId ?? undefined,
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    const docs = await ctx.db
      .query("approvalGates")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .take(limit);

    return docs.map(toApprovalGateDto);
  },
});

export const get = internalQuery({
  args: { gateId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("approvalGates")
      .withIndex("by_gateId", (q) => q.eq("gateId", args.gateId))
      .unique();

    return doc ? toApprovalGateDto(doc) : null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    gateId: v.string(),
    targetId: v.string(),
    gateType: v.union(
      v.literal("intake"),
      v.literal("test-plan"),
      v.literal("execution"),
      v.literal("report-release"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("bypassed"),
    ),
    requestedAt: v.string(),
    requestedBy: v.string(),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    bypassJustification: v.optional(v.string()),
    linkedArtifactId: v.optional(v.string()),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("approvalGates")
      .withIndex("by_gateId", (q) => q.eq("gateId", args.gateId))
      .unique();

    if (existing) {
      throw new Error(`ApprovalGate "${args.gateId}" already exists.`);
    }

    const id = await ctx.db.insert("approvalGates", {
      gateId: args.gateId,
      targetId: args.targetId,
      gateType: args.gateType,
      status: args.status,
      requestedAt: args.requestedAt,
      requestedBy: args.requestedBy,
      approvedBy: args.approvedBy,
      approvedAt: args.approvedAt,
      rejectionReason: args.rejectionReason,
      bypassJustification: args.bypassJustification,
      linkedArtifactId: args.linkedArtifactId,
      runId: args.runId,
    });

    return { id, gateId: args.gateId };
  },
});

export const updateStatus = internalMutation({
  args: {
    gateId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("bypassed"),
    ),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    bypassJustification: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("approvalGates")
      .withIndex("by_gateId", (q) => q.eq("gateId", args.gateId))
      .unique();

    if (!doc) {
      throw new Error(`ApprovalGate "${args.gateId}" not found.`);
    }

    validateApprovalGateTransition(doc.status, args.status);

    const patch: Partial<Doc<"approvalGates">> = {
      status: args.status,
    };

    if (args.status === "approved") {
      await requireApprover(ctx);
      if (!args.approvedBy) {
        throw new Error('Approval status "approved" requires approvedBy.');
      }
      if (!args.approvedAt) {
        throw new Error('Approval status "approved" requires approvedAt.');
      }
      patch.approvedBy = args.approvedBy;
      patch.approvedAt = args.approvedAt;
      patch.rejectionReason = undefined;
      patch.bypassJustification = undefined;
    }

    if (args.status === "rejected") {
      await requireApprover(ctx);
      if (!args.rejectionReason) {
        throw new Error('Approval status "rejected" requires rejectionReason.');
      }
      patch.rejectionReason = args.rejectionReason;
      patch.approvedBy = undefined;
      patch.approvedAt = undefined;
      patch.bypassJustification = undefined;
    }

    if (args.status === "bypassed") {
      await requireAdmin(ctx);
      if (!args.bypassJustification || args.bypassJustification.length < 10) {
        throw new Error(
          'Approval status "bypassed" requires bypassJustification of at least 10 characters.',
        );
      }
      patch.bypassJustification = args.bypassJustification;
      patch.approvedBy = undefined;
      patch.approvedAt = undefined;
      patch.rejectionReason = undefined;
    }

    if (args.status === "pending") {
      // Reset approval fields when reverting to pending
      patch.approvedBy = undefined;
      patch.approvedAt = undefined;
      patch.rejectionReason = undefined;
      patch.bypassJustification = undefined;
    }

    await ctx.db.patch(doc._id, patch);
    return { id: doc._id, gateId: args.gateId };
  },
});

// ============================================================================
// Helpers
// ============================================================================

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return MAX_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `approvalGates.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
