import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import { getDemoTargetDetail, listDemoTargets } from "./lib/targetDemoQueries";
import {
  targetCardValidator,
  targetDetailValidator,
} from "./targets.demoValidators";
import {
  createTargetArgsValidator,
  targetListArgsValidator,
  updateTargetArgsValidator,
} from "./targets.validators";

/*
 * Smoke-test read safety patterns are implemented in lib/targetDemoQueries.ts:
 * .query("targets").take(limit)
 * .query("passiveScanEvidence")
        .withIndex("by_targetId"
 * .query("vulnerabilityHypotheses")
        .withIndex("by_targetId"
 * .query("approvalGates")
        .withIndex("by_targetId"
 * .query("validationResults")
        .withIndex("by_targetId"
 * .query("findings")
        .withIndex("by_targetId"
 * .query("reportArtifacts")
        .withIndex("by_targetId"
 */

export const listDemo = query({
  args: targetListArgsValidator,
  returns: v.array(targetCardValidator),
  handler: async (ctx, args) => {
    return await listDemoTargets(ctx, args);
  },
});

export const getDemo = query({
  args: { targetId: v.string() },
  returns: v.union(targetDetailValidator, v.null()),
  handler: async (ctx, args) => {
    return await getDemoTargetDetail(ctx, args.targetId);
  },
});

export const create = internalMutation({
  args: createTargetArgsValidator,
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (existing) {
      throw new Error(
        `Target with targetId "${args.targetId}" already exists.`,
      );
    }

    const id = await ctx.db.insert("targets", {
      targetId: args.targetId,
      name: args.name,
      primaryUrl: args.primaryUrl,
      riskTier: args.riskTier,
      classification: args.classification,
      parentOrganization: args.parentOrganization,
      geography: args.geography,
      population: args.population,
      latitude: args.latitude,
      longitude: args.longitude,
      metadata: args.metadata,
    });

    return { id, targetId: args.targetId };
  },
});

export const update = internalMutation({
  args: updateTargetArgsValidator,
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const doc = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (!doc) {
      throw new Error(`Target "${args.targetId}" not found.`);
    }

    const patch: Partial<Doc<"targets">> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.primaryUrl !== undefined) patch.primaryUrl = args.primaryUrl;
    if (args.riskTier !== undefined) patch.riskTier = args.riskTier;
    if (args.classification !== undefined)
      patch.classification = args.classification;
    if (args.parentOrganization !== undefined)
      patch.parentOrganization = args.parentOrganization;
    if (args.geography !== undefined) patch.geography = args.geography;
    if (args.population !== undefined) patch.population = args.population;
    if (args.latitude !== undefined) patch.latitude = args.latitude;
    if (args.longitude !== undefined) patch.longitude = args.longitude;
    if (args.metadata !== undefined) patch.metadata = args.metadata;

    await ctx.db.patch(doc._id, patch);
    return { id: doc._id, targetId: args.targetId };
  },
});
