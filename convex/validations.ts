import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * validationResults.create — Creates a validation result.
 * Always inserts (child records).
 */
export const create = internalMutation({
  args: {
    result: v.object({
      resultId: v.string(),
      hypothesisId: v.string(),
      gateId: v.string(),
      runId: v.string(),
      targetId: v.string(),
      status: v.union(
        v.literal("confirmed"),
        v.literal("skipped"),
        v.literal("halted"),
        v.literal("rejected"),
      ),
      executedAt: v.string(),
      completedAt: v.optional(v.string()),
      evidenceIds: v.array(v.string()),
      findings: v.optional(v.array(v.string())),
      agentId: v.string(),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("validationResults", {
      resultId: args.result.resultId,
      hypothesisId: args.result.hypothesisId,
      gateId: args.result.gateId,
      runId: args.result.runId,
      targetId: args.result.targetId,
      status: args.result.status,
      executedAt: args.result.executedAt,
      completedAt: args.result.completedAt,
      evidenceIds: args.result.evidenceIds,
      findings: args.result.findings,
      agentId: args.result.agentId,
      notes: args.result.notes,
    });
    return { success: true, resultId: id };
  },
});