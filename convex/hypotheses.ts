import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * vulnerabilityHypotheses.upsert — Creates or updates a hypothesis.
 * Uses by_hypothesisId index to check for existing documents.
 */
export const upsert = internalMutation({
  args: {
    hypothesis: v.object({
      hypothesisId: v.string(),
      targetId: v.string(),
      runId: v.string(),
      category: v.union(
        v.literal("tls"),
        v.literal("headers"),
        v.literal("cms"),
        v.literal("exposure"),
        v.literal("availability"),
        v.literal("known-vulnerability"),
      ),
      severity: v.union(
        v.literal("info"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
      title: v.string(),
      description: v.string(),
      evidenceIds: v.array(v.string()),
      confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      createdAt: v.string(),
      sourceAgent: v.string(),
      status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vulnerabilityHypotheses")
      .withIndex("by_hypothesisId", (q) => q.eq("hypothesisId", args.hypothesis.hypothesisId))
      .unique();

    if (existing) {
      // Update existing document
      await ctx.db.patch(existing._id, {
        targetId: args.hypothesis.targetId,
        runId: args.hypothesis.runId,
        category: args.hypothesis.category,
        severity: args.hypothesis.severity,
        title: args.hypothesis.title,
        description: args.hypothesis.description,
        evidenceIds: args.hypothesis.evidenceIds,
        confidence: args.hypothesis.confidence,
        sourceAgent: args.hypothesis.sourceAgent,
        status: args.hypothesis.status,
      });
      return { success: true, hypothesisId: existing._id };
    } else {
      // Insert new document
      const id = await ctx.db.insert("vulnerabilityHypotheses", {
        hypothesisId: args.hypothesis.hypothesisId,
        targetId: args.hypothesis.targetId,
        runId: args.hypothesis.runId,
        category: args.hypothesis.category,
        severity: args.hypothesis.severity,
        title: args.hypothesis.title,
        description: args.hypothesis.description,
        evidenceIds: args.hypothesis.evidenceIds,
        confidence: args.hypothesis.confidence,
        createdAt: args.hypothesis.createdAt,
        sourceAgent: args.hypothesis.sourceAgent,
        status: args.hypothesis.status,
      });
      return { success: true, hypothesisId: id };
    }
  },
});