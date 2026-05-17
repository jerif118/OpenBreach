import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * passiveScanEvidence.append — Appends evidence to a run.
 * Always inserts (child records, don't upsert).
 */
export const append = internalMutation({
  args: {
    evidence: v.object({
      evidenceId: v.string(),
      runId: v.string(),
      targetId: v.string(),
      collectedAt: v.string(),
      sourceAgent: v.string(),
      observationType: v.union(
        v.literal("response-header"),
        v.literal("resource-load"),
        v.literal("tls-version"),
        v.literal("content-match"),
      ),
      rawData: v.record(v.string(), v.string()),
      canonicalUrl: v.string(),
      evidenceRefs: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("passiveScanEvidence", {
      evidenceId: args.evidence.evidenceId,
      runId: args.evidence.runId,
      targetId: args.evidence.targetId,
      collectedAt: args.evidence.collectedAt,
      sourceAgent: args.evidence.sourceAgent,
      observationType: args.evidence.observationType,
      rawData: args.evidence.rawData,
      canonicalUrl: args.evidence.canonicalUrl,
      evidenceRefs: args.evidence.evidenceRefs,
    });
    return { success: true, evidenceId: id };
  },
});