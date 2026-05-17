import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { FindingDto } from "./types";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toFindingDto(doc: Doc<"findings">): FindingDto {
  return {
    findingId: doc.findingId,
    targetId: doc.targetId,
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    status: doc.status,
    createdAt: doc.createdAt,
    category: doc.category ?? undefined,
    evidence: doc.evidence ?? undefined,
    remediationHint: doc.remediationHint ?? undefined,
    affectedAssets: doc.affectedAssets ?? undefined,
    confidence: doc.confidence ?? undefined,
    cweId: doc.cweId ?? undefined,
    cvssScore: doc.cvssScore ?? undefined,
    validationResultId: doc.validationResultId ?? undefined,
    reportReady: doc.reportReady ?? undefined,
    runId: doc.runId ?? undefined,
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    severity: v.optional(
      v.union(
        v.literal("info"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    let query = ctx.db
      .query("findings")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    const docs = await query.take(limit);
    const filtered = args.severity
      ? docs.filter((d) => d.severity === args.severity)
      : docs;
    return filtered.map(toFindingDto);
  },
});

export const listByValidationResult = internalQuery({
  args: {
    validationResultId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    const docs = await ctx.db
      .query("findings")
      .withIndex("by_validationResultId", (q) =>
        q.eq("validationResultId", args.validationResultId),
      )
      .take(limit);

    return docs.map(toFindingDto);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    findingId: v.string(),
    targetId: v.string(),
    title: v.string(),
    description: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    status: v.union(
      v.literal("observed"),
      v.literal("confirmed"),
      v.literal("likely"),
      v.literal("skipped"),
      v.literal("unresolved"),
      v.literal("false-positive"),
    ),
    createdAt: v.string(),
    category: v.optional(
      v.union(
        v.literal("tls"),
        v.literal("headers"),
        v.literal("cms"),
        v.literal("exposure"),
        v.literal("admin-exposure"),
        v.literal("availability"),
        v.literal("known-vulnerability"),
        v.literal("configuration"),
        v.literal("logic"),
      ),
    ),
    evidence: v.optional(v.string()),
    remediationHint: v.optional(v.string()),
    affectedAssets: v.optional(v.array(v.string())),
    confidence: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    cweId: v.optional(v.string()),
    cvssScore: v.optional(v.number()),
    validationResultId: v.optional(v.string()),
    reportReady: v.optional(v.boolean()),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("findings")
      .withIndex("by_findingId", (q) => q.eq("findingId", args.findingId))
      .unique();

    if (existing) {
      throw new Error(`Finding "${args.findingId}" already exists.`);
    }

    // confirmed requires validationResultId
    if (args.status === "confirmed" && !args.validationResultId) {
      throw new Error(
        'Finding status "confirmed" requires a validationResultId.',
      );
    }

    const id = await ctx.db.insert("findings", {
      findingId: args.findingId,
      targetId: args.targetId,
      title: args.title,
      description: args.description,
      severity: args.severity,
      status: args.status,
      createdAt: args.createdAt,
      category: args.category,
      evidence: args.evidence,
      remediationHint: args.remediationHint,
      affectedAssets: args.affectedAssets,
      confidence: args.confidence,
      cweId: args.cweId,
      cvssScore: args.cvssScore,
      validationResultId: args.validationResultId,
      reportReady: args.reportReady,
      runId: args.runId,
    });

    return { id, findingId: args.findingId };
  },
});

export const update = internalMutation({
  args: {
    findingId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    severity: v.optional(
      v.union(
        v.literal("info"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
    status: v.optional(
      v.union(
        v.literal("observed"),
        v.literal("confirmed"),
        v.literal("likely"),
        v.literal("skipped"),
        v.literal("unresolved"),
        v.literal("false-positive"),
      ),
    ),
    category: v.optional(
      v.union(
        v.literal("tls"),
        v.literal("headers"),
        v.literal("cms"),
        v.literal("exposure"),
        v.literal("admin-exposure"),
        v.literal("availability"),
        v.literal("known-vulnerability"),
        v.literal("configuration"),
        v.literal("logic"),
      ),
    ),
    evidence: v.optional(v.string()),
    remediationHint: v.optional(v.string()),
    affectedAssets: v.optional(v.array(v.string())),
    confidence: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    cweId: v.optional(v.string()),
    cvssScore: v.optional(v.number()),
    validationResultId: v.optional(v.string()),
    reportReady: v.optional(v.boolean()),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const doc = await ctx.db
      .query("findings")
      .withIndex("by_findingId", (q) => q.eq("findingId", args.findingId))
      .unique();

    if (!doc) {
      throw new Error(`Finding "${args.findingId}" not found.`);
    }

    const patch: Partial<Doc<"findings">> = {};

    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.severity !== undefined) patch.severity = args.severity;
    if (args.category !== undefined) patch.category = args.category;
    if (args.evidence !== undefined) patch.evidence = args.evidence;
    if (args.remediationHint !== undefined)
      patch.remediationHint = args.remediationHint;
    if (args.affectedAssets !== undefined)
      patch.affectedAssets = args.affectedAssets;
    if (args.confidence !== undefined) patch.confidence = args.confidence;
    if (args.cweId !== undefined) patch.cweId = args.cweId;
    if (args.cvssScore !== undefined) patch.cvssScore = args.cvssScore;
    if (args.validationResultId !== undefined)
      patch.validationResultId = args.validationResultId;
    if (args.reportReady !== undefined) patch.reportReady = args.reportReady;
    if (args.runId !== undefined) patch.runId = args.runId;

    if (args.status !== undefined) {
      patch.status = args.status;
      if (
        args.status === "confirmed" &&
        !args.validationResultId &&
        !doc.validationResultId
      ) {
        throw new Error(
          'Finding status "confirmed" requires a validationResultId.',
        );
      }
    }

    await ctx.db.patch(doc._id, patch);
    return { id: doc._id, findingId: args.findingId };
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
      `findings.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
