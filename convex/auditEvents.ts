import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { AuditEventDto } from "./types";
import { appendAuditEvent } from "./lib/audit";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toAuditEventDto(doc: Doc<"auditEvents">): AuditEventDto {
  return {
    eventId: doc.eventId,
    targetId: doc.targetId,
    eventType: doc.eventType,
    actor: doc.actor,
    timestamp: doc.timestamp,
    runId: doc.runId ?? undefined,
    details: doc.details ?? undefined,
    ipAddress: doc.ipAddress ?? undefined,
    userAgent: doc.userAgent ?? undefined,
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
      .query("auditEvents")
      .withIndex("by_targetId_and_timestamp", (q) =>
        q.eq("targetId", args.targetId),
      )
      .order("desc")
      .take(limit);

    return docs.map(toAuditEventDto);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const append = internalMutation({
  args: {
    eventId: v.string(),
    targetId: v.string(),
    eventType: v.union(
      v.literal("target-created"),
      v.literal("target-updated"),
      v.literal("target-rejected"),
      v.literal("workflow-started"),
      v.literal("workflow-completed"),
      v.literal("workflow-halted"),
      v.literal("phase-changed"),
      v.literal("evidence-recorded"),
      v.literal("hypothesis-proposed"),
      v.literal("approval-requested"),
      v.literal("approval-granted"),
      v.literal("approval-rejected"),
      v.literal("gate-approved"),
      v.literal("gate-rejected"),
      v.literal("finding-created"),
      v.literal("finding-updated"),
      v.literal("validation-recorded"),
      v.literal("report-generated"),
      v.literal("report-completed"),
      v.literal("auth-granted"),
      v.literal("auth-revoked"),
      v.literal("manual-override"),
    ),
    actor: v.string(),
    timestamp: v.string(),
    runId: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.any())),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await appendAuditEvent(ctx, {
      eventId: args.eventId,
      targetId: args.targetId,
      eventType: args.eventType,
      actor: args.actor,
      timestamp: args.timestamp,
      runId: args.runId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    return result;
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
      `auditEvents.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
