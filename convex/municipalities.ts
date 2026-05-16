import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const riskTier = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const seedMunicipality = v.object({
  id: v.string(),
  name: v.string(),
  state: v.string(),
  population: v.number(),
  websiteUrl: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  sourceUrl: v.string(),
  riskTier,
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("municipalities").take(args.limit ?? 50);
  },
});

export const get = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("municipalities")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});

export const seed = mutation({
  args: { municipalities: v.array(seedMunicipality) },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const municipality of args.municipalities) {
      const existing = await ctx.db
        .query("municipalities")
        .withIndex("by_externalId", (q) => q.eq("externalId", municipality.id))
        .unique();

      const document = {
        externalId: municipality.id,
        name: municipality.name,
        state: municipality.state,
        websiteUrl: municipality.websiteUrl,
        population: municipality.population,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
        sourceUrl: municipality.sourceUrl,
        riskTier: municipality.riskTier,
      };

      if (existing) {
        await ctx.db.replace(existing._id, document);
        updated += 1;
      } else {
        await ctx.db.insert("municipalities", document);
        inserted += 1;
      }
    }

    return { inserted, updated, total: args.municipalities.length };
  },
});
