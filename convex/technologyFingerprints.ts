import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { TechnologyFingerprintDto } from "./types";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toTechnologyFingerprintDto(
  doc: Doc<"technologyFingerprints">,
): TechnologyFingerprintDto {
  return {
    fingerprintId: doc.fingerprintId,
    targetId: doc.targetId,
    technology: doc.technology,
    category: doc.category,
    confidence: doc.confidence,
    detectedAt: doc.detectedAt,
    version: doc.version ?? undefined,
    versionConfidence: doc.versionConfidence ?? undefined,
    evidence: doc.evidence ?? undefined,
    cpe: doc.cpe ?? undefined,
    runId: doc.runId ?? undefined,
    envelopeSource: doc.envelopeSource,
    envelopeRecordedAt: doc.envelopeRecordedAt,
    envelopeHash: doc.envelopeHash,
    envelopeCollectedBy: doc.envelopeCollectedBy,
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    runId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    let query = ctx.db
      .query("technologyFingerprints")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    if (args.runId) {
      query = ctx.db
        .query("technologyFingerprints")
        .withIndex("by_targetId_and_runId", (q) =>
          q.eq("targetId", args.targetId).eq("runId", args.runId),
        );
    }

    const docs = await query.take(limit);
    return docs.map(toTechnologyFingerprintDto);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const upsert = internalMutation({
  args: {
    fingerprintId: v.string(),
    targetId: v.string(),
    technology: v.string(),
    category: v.union(
      v.literal("server"),
      v.literal("framework"),
      v.literal("cms"),
      v.literal("database"),
      v.literal("library"),
      v.literal("cdn"),
      v.literal("analytics"),
      v.literal("other"),
    ),
    confidence: v.number(),
    detectedAt: v.string(),
    version: v.optional(v.string()),
    versionConfidence: v.optional(v.number()),
    evidence: v.optional(v.array(v.string())),
    cpe: v.optional(v.string()),
    runId: v.optional(v.string()),
    envelopeSource: v.string(),
    envelopeRecordedAt: v.string(),
    envelopeHash: v.string(),
    envelopeCollectedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("technologyFingerprints")
      .withIndex("by_fingerprintId", (q) =>
        q.eq("fingerprintId", args.fingerprintId),
      )
      .unique();

    const document = {
      fingerprintId: args.fingerprintId,
      targetId: args.targetId,
      technology: args.technology,
      category: args.category,
      confidence: args.confidence,
      detectedAt: args.detectedAt,
      version: args.version,
      versionConfidence: args.versionConfidence,
      evidence: args.evidence,
      cpe: args.cpe,
      runId: args.runId,
      envelopeSource: args.envelopeSource,
      envelopeRecordedAt: args.envelopeRecordedAt,
      envelopeHash: args.envelopeHash,
      envelopeCollectedBy: args.envelopeCollectedBy,
    };

    if (existing) {
      await ctx.db.replace(existing._id, document);
      return {
        id: existing._id,
        fingerprintId: args.fingerprintId,
        action: "updated",
      };
    }

    const id = await ctx.db.insert("technologyFingerprints", document);
    return { id, fingerprintId: args.fingerprintId, action: "created" };
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
      `technologyFingerprints.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
