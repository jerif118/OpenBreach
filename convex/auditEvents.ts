import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Use globalThis.crypto for UUID generation (available in Convex runtime)
function generateEventId(): string {
  return globalThis.crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * auditEvents.append — Appends an audit event.
 * Generates eventId using crypto.randomUUID().
 */
export const append = internalMutation({
  args: {
    event: v.object({
      timestamp: v.string(),
      eventType: v.union(
        v.literal("scope_created"),
        v.literal("workflow_started"),
        v.literal("workflow_completed"),
        v.literal("hypothesis_created"),
        v.literal("gate_requested"),
        v.literal("gate_approved"),
        v.literal("gate_rejected"),
        v.literal("validation_executed"),
        v.literal("finding_confirmed"),
        v.literal("report_generated"),
      ),
      agentId: v.string(),
      targetId: v.optional(v.string()),
      runId: v.optional(v.string()),
      entityId: v.optional(v.string()),
      entityType: v.optional(v.string()),
      metadata: v.optional(v.record(v.string(), v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const eventId = generateEventId();

    const id = await ctx.db.insert("auditEvents", {
      eventId,
      timestamp: args.event.timestamp,
      eventType: args.event.eventType,
      agentId: args.event.agentId,
      targetId: args.event.targetId,
      runId: args.event.runId,
      entityId: args.event.entityId,
      entityType: args.event.entityType,
      metadata: args.event.metadata,
    });

    return { success: true, eventId };
  },
});