import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { ReportArtifactDto } from "./types/reports";
import { appendAuditEvent } from "./lib/audit";

const MAX_LIST_LIMIT = 100;

const reportArtifactStatusValidator = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
);

const reportArtifactVariantValidator = v.union(
  v.literal("technical"),
  v.literal("friendly"),
  v.literal("executive"),
);

const reportArtifactSectionValidator = v.object({
  title: v.string(),
  narrative: v.string(),
  bullets: v.array(v.string()),
});

const reportArtifactSectionsValidator = v.array(reportArtifactSectionValidator);

const reportArtifactPdfValidator = v.object({
  storagePath: v.string(),
  fileName: v.string(),
  contentType: v.literal("application/pdf"),
  generatedAt: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
});

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

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    status: v.optional(reportArtifactStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    if (args.status) {
      const status = args.status;
      const docs = await ctx.db
        .query("reportArtifacts")
        .withIndex("by_targetId_and_status", (q) =>
          q.eq("targetId", args.targetId).eq("status", status),
        )
        .take(limit);

      return docs.map(toReportArtifactDto);
    }

    const query = ctx.db
      .query("reportArtifacts")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    const docs = await query.take(limit);
    return docs.map(toReportArtifactDto);
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

export const create = internalMutation({
  args: {
    artifactId: v.string(),
    targetId: v.string(),
    variant: reportArtifactVariantValidator,
    title: v.string(),
    generatedAt: v.string(),
    status: reportArtifactStatusValidator,
    findings: v.array(v.string()),
    sections: v.optional(reportArtifactSectionsValidator),
    pdf: v.optional(reportArtifactPdfValidator),
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
    const actor = await requireOperatorOrAdmin(ctx);

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

    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "report-generated",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: args.runId,
      details: {
        artifactId: args.artifactId,
        status: args.status,
        variant: args.variant,
      },
    });

    return { id, artifactId: args.artifactId };
  },
});

export const complete = internalMutation({
  args: {
    artifactId: v.string(),
    pdf: reportArtifactPdfValidator,
    sections: v.optional(reportArtifactSectionsValidator),
  },
  handler: async (ctx, args) => {
    const actor = await requireOperatorOrAdmin(ctx);

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

    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: "report-completed",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: doc.runId,
      details: { artifactId: args.artifactId, status: "completed" },
    });

    return { id: doc._id, artifactId: args.artifactId };
  },
});

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
