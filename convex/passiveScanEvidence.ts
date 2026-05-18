import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { PassiveScanEvidenceDto } from "./types/passiveScan";
import { appendAuditEvent } from "./lib/audit";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toPassiveScanEvidenceDto(
  doc: Doc<"passiveScanEvidence">,
): PassiveScanEvidenceDto {
  return {
    evidenceId: doc.evidenceId,
    targetId: doc.targetId,
    source: doc.source,
    collectedAt: doc.collectedAt,
    requestedUrl: doc.requestedUrl,
    reachable: doc.reachable,
    finalUrl: doc.finalUrl ?? undefined,
    httpStatus: doc.httpStatus ?? undefined,
    headers: doc.headers ?? undefined,
    tls: doc.tls
      ? {
          valid: doc.tls.valid,
          expiresAt: doc.tls.expiresAt ?? undefined,
          issuer: doc.tls.issuer ?? undefined,
        }
      : undefined,
    cms: doc.cms
      ? {
          name: doc.cms.name,
          version: doc.cms.version ?? undefined,
          confidence: doc.cms.confidence,
          evidence: doc.cms.evidence,
        }
      : undefined,
    adminExposure: doc.adminExposure
      ? doc.adminExposure.map((ae) => ({
          path: ae.path,
          method: ae.method ?? undefined,
          reachable: ae.reachable,
          httpStatus: ae.httpStatus ?? undefined,
          finalUrl: ae.finalUrl ?? undefined,
        }))
      : undefined,
    errors: doc.errors
      ? doc.errors.map((e) => ({
          stage: e.stage,
          message: e.message,
        }))
      : undefined,
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
      .query("passiveScanEvidence")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    if (args.runId) {
      query = ctx.db
        .query("passiveScanEvidence")
        .withIndex("by_targetId_and_runId", (q) =>
          q.eq("targetId", args.targetId).eq("runId", args.runId),
        );
    }

    const docs = await query.take(limit);
    return docs.map(toPassiveScanEvidenceDto);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const upsert = internalMutation({
  args: {
    evidenceId: v.string(),
    targetId: v.string(),
    source: v.string(),
    collectedAt: v.string(),
    requestedUrl: v.string(),
    reachable: v.boolean(),
    finalUrl: v.optional(v.string()),
    httpStatus: v.optional(v.number()),
    headers: v.optional(v.record(v.string(), v.string())),
    tls: v.optional(
      v.object({
        valid: v.boolean(),
        expiresAt: v.optional(v.string()),
        issuer: v.optional(v.string()),
      }),
    ),
    cms: v.optional(
      v.object({
        name: v.string(),
        version: v.optional(v.string()),
        confidence: v.number(),
        evidence: v.array(v.string()),
      }),
    ),
    adminExposure: v.optional(
      v.array(
        v.object({
          path: v.string(),
          method: v.optional(v.union(v.literal("HEAD"), v.literal("GET"))),
          reachable: v.boolean(),
          httpStatus: v.optional(v.number()),
          finalUrl: v.optional(v.string()),
        }),
      ),
    ),
    errors: v.optional(
      v.array(
        v.object({
          stage: v.union(
            v.literal("dns"),
            v.literal("http"),
            v.literal("tls"),
            v.literal("cms"),
            v.literal("admin-exposure"),
          ),
          message: v.string(),
        }),
      ),
    ),
    runId: v.optional(v.string()),
    envelopeSource: v.string(),
    envelopeRecordedAt: v.string(),
    envelopeHash: v.string(),
    envelopeCollectedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("passiveScanEvidence")
      .withIndex("by_evidenceId", (q) => q.eq("evidenceId", args.evidenceId))
      .unique();

    const document = {
      evidenceId: args.evidenceId,
      targetId: args.targetId,
      source: args.source,
      collectedAt: args.collectedAt,
      requestedUrl: args.requestedUrl,
      reachable: args.reachable,
      finalUrl: args.finalUrl,
      httpStatus: args.httpStatus,
      headers: args.headers,
      tls: args.tls,
      cms: args.cms,
      adminExposure: args.adminExposure,
      errors: args.errors,
      runId: args.runId,
      envelopeSource: args.envelopeSource,
      envelopeRecordedAt: args.envelopeRecordedAt,
      envelopeHash: args.envelopeHash,
      envelopeCollectedBy: args.envelopeCollectedBy,
    };

    let id: Doc<"passiveScanEvidence">["_id"];
    let action: "created" | "updated";

    if (existing) {
      await ctx.db.replace(existing._id, document);
      id = existing._id;
      action = "updated";
    } else {
      id = await ctx.db.insert("passiveScanEvidence", document);
      action = "created";
    }

    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "evidence-recorded",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: args.runId,
      details: {
        evidenceId: args.evidenceId,
        source: args.source,
        action,
      },
    });
    return { id, evidenceId: args.evidenceId, action };
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
      `passiveScanEvidence.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
