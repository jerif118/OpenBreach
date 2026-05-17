import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { ReportArtifactDto } from "./types";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toReportArtifactDto(doc: Doc<"reportArtifacts">): ReportArtifactDto {
  return {
    artifactId: doc.artifactId,
    targetId: doc.targetId,
    variant: doc.variant,
    title: doc.title,
    generatedAt: doc.generatedAt,
    status: doc.status,
    findings: doc.findings,
    sections: doc.sections
      ? doc.sections.map((s) => ({
          title: s.title,
          narrative: s.narrative,
          bullets: s.bullets,
        }))
      : undefined,
    pdf: doc.pdf
      ? {
          storagePath: doc.pdf.storagePath,
          fileName: doc.pdf.fileName,
          contentType: doc.pdf.contentType,
          generatedAt: doc.pdf.generatedAt ?? undefined,
          sizeBytes: doc.pdf.sizeBytes ?? undefined,
        }
      : undefined,
    generatedBy: doc.generatedBy ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    let query = ctx.db
      .query("reportArtifacts")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    const docs = await query.take(limit);
    const filtered = args.status
      ? docs.filter((d) => d.status === args.status)
      : docs;
    return filtered.map(toReportArtifactDto);
  },
});

export const get = internalQuery({
  args: { artifactId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("reportArtifacts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .unique();

    return doc ? toReportArtifactDto(doc) : null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    artifactId: v.string(),
    targetId: v.string(),
    variant: v.union(
      v.literal("technical"),
      v.literal("friendly"),
      v.literal("executive"),
    ),
    title: v.string(),
    generatedAt: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    findings: v.array(v.string()),
    sections: v.optional(
      v.array(
        v.object({
          title: v.string(),
          narrative: v.string(),
          bullets: v.array(v.string()),
        }),
      ),
    ),
    pdf: v.optional(
      v.object({
        storagePath: v.string(),
        fileName: v.string(),
        contentType: v.literal("application/pdf"),
        generatedAt: v.optional(v.string()),
        sizeBytes: v.optional(v.number()),
      }),
    ),
    generatedBy: v.optional(
      v.union(
        v.literal("deterministic-fallback"),
        v.literal("ai-provider"),
        v.literal("template-engine"),
      ),
    ),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("reportArtifacts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .unique();

    if (existing) {
      throw new Error(`ReportArtifact "${args.artifactId}" already exists.`);
    }

    if (args.status === "completed" && !args.pdf) {
      throw new Error(
        'ReportArtifact status "completed" requires a pdf reference.',
      );
    }

    const id = await ctx.db.insert("reportArtifacts", {
      artifactId: args.artifactId,
      targetId: args.targetId,
      variant: args.variant,
      title: args.title,
      generatedAt: args.generatedAt,
      status: args.status,
      findings: args.findings,
      sections: args.sections,
      pdf: args.pdf,
      generatedBy: args.generatedBy,
      runId: args.runId,
      metadata: args.metadata,
    });

    return { id, artifactId: args.artifactId };
  },
});

export const complete = internalMutation({
  args: {
    artifactId: v.string(),
    pdf: v.object({
      storagePath: v.string(),
      fileName: v.string(),
      contentType: v.literal("application/pdf"),
      generatedAt: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
    }),
    sections: v.optional(
      v.array(
        v.object({
          title: v.string(),
          narrative: v.string(),
          bullets: v.array(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const doc = await ctx.db
      .query("reportArtifacts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .unique();

    if (!doc) {
      throw new Error(`ReportArtifact "${args.artifactId}" not found.`);
    }

    await ctx.db.patch(doc._id, {
      status: "completed",
      pdf: args.pdf,
      sections: args.sections,
    });

    return { id: doc._id, artifactId: args.artifactId };
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
      `reportArtifacts.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
