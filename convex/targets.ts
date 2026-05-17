import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin, requireAnyRole, ROLES } from "./auth";
import type { TargetProfileDto, TargetListItemDto } from "./types";
import {
  isConvexConfigured,
  loadFixture,
  mapFixtureToTargetProfileDto,
} from "./lib/fixtureFallback";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toTargetProfileDto(doc: Doc<"targets">): TargetProfileDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    parentOrganization: doc.parentOrganization ?? undefined,
    geography: doc.geography
      ? {
          country: doc.geography.country,
          region: doc.geography.region,
          city: doc.geography.city,
        }
      : undefined,
    population: doc.population ?? undefined,
    latitude: doc.latitude ?? undefined,
    longitude: doc.longitude ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

function toTargetListItemDto(doc: Doc<"targets">): TargetListItemDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listDemo = internalQuery({
  args: {
    limit: v.optional(v.number()),
    riskTier: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    if (!isConvexConfigured()) {
      try {
        const fixture = await loadFixture<unknown>("target-approved-public");
        const dto = mapFixtureToTargetProfileDto(fixture);
        return [dto];
      } catch {
        return [];
      }
    }

    if (args.riskTier) {
      const docs = await ctx.db
        .query("targets")
        .withIndex("by_riskTier", (q) => q.eq("riskTier", args.riskTier!))
        .take(limit);
      return docs.map(toTargetListItemDto);
    }

    const docs = await ctx.db.query("targets").take(limit);
    return docs.map(toTargetListItemDto);
  },
});

export const getDemo = internalQuery({
  args: { targetId: v.string() },
  handler: async (ctx, args) => {
    if (!isConvexConfigured()) {
      try {
        const fixture = await loadFixture<unknown>("target-approved-public");
        const dto = mapFixtureToTargetProfileDto(fixture);
        return dto.targetId === args.targetId ? dto : null;
      } catch {
        return null;
      }
    }

    const doc = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (!doc) return null;

    // Include latest run info if available
    const latestRun = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", doc.targetId))
      .order("desc")
      .take(1);

    return {
      ...toTargetProfileDto(doc),
      latestRun: latestRun[0]
        ? {
            runId: latestRun[0].runId,
            status: latestRun[0].status,
            currentPhase: latestRun[0].currentPhase,
          }
        : null,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    targetId: v.string(),
    name: v.string(),
    primaryUrl: v.string(),
    riskTier: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
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
  },
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
  args: {
    targetId: v.string(),
    name: v.optional(v.string()),
    primaryUrl: v.optional(v.string()),
    riskTier: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
    classification: v.optional(
      v.union(
        v.literal("public-sector"),
        v.literal("private"),
        v.literal("infrastructure"),
        v.literal("other"),
      ),
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
  },
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

// ============================================================================
// Helpers
// ============================================================================

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `targets.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
