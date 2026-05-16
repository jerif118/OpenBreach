import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getForMunicipality = query({
  args: { municipalityId: v.id("municipalities"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("remediationReports")
      .withIndex("by_municipalityId", (q) => q.eq("municipalityId", args.municipalityId))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

export const createPlaceholder = mutation({
  args: {
    municipalityId: v.id("municipalities"),
    externalId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to create report placeholders.");
    }

    return await ctx.db.insert("remediationReports", {
      externalId: args.externalId,
      municipalityId: args.municipalityId,
      generatedAt: new Date().toISOString(),
      summary: args.summary,
      priorityActions: [],
      findings: [],
      generatedBy: "deterministic-fallback",
    });
  },
});
