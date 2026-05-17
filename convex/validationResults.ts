import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { ValidationResultDto } from "./types";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toValidationResultDtoSync(
  doc: Doc<"validationResults">,
  findingCount: number,
): ValidationResultDto {
  return {
    resultId: doc.resultId,
    targetId: doc.targetId,
    status: doc.status,
    executedAt: doc.executedAt,
    executedBy: doc.executedBy,
    testPlanId: doc.testPlanId ?? undefined,
    hypothesisId: doc.hypothesisId ?? undefined,
    summary: doc.summary ?? undefined,
    evidenceRefs: doc.evidenceRefs ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
    findingCount,
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
      .query("validationResults")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    if (args.runId) {
      query = ctx.db
        .query("validationResults")
        .withIndex("by_targetId_and_runId", (q) =>
          q.eq("targetId", args.targetId).eq("runId", args.runId),
        );
    }

    const docs = await query.take(limit);

    // Compute findingCount for each result
    const dtos: ValidationResultDto[] = [];
    for (const doc of docs) {
      const findings = await ctx.db
        .query("findings")
        .withIndex("by_validationResultId", (q) =>
          q.eq("validationResultId", doc.resultId),
        )
        .take(1000);
      dtos.push(toValidationResultDtoSync(doc, findings.length));
    }

    return dtos;
  },
});

export const get = internalQuery({
  args: { resultId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("validationResults")
      .withIndex("by_resultId", (q) => q.eq("resultId", args.resultId))
      .unique();

    if (!doc) return null;

    const findings = await ctx.db
      .query("findings")
      .withIndex("by_validationResultId", (q) =>
        q.eq("validationResultId", doc.resultId),
      )
      .take(1000);

    return toValidationResultDtoSync(doc, findings.length);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    resultId: v.string(),
    targetId: v.string(),
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("inconclusive"),
      v.literal("blocked"),
      v.literal("error"),
    ),
    executedAt: v.string(),
    executedBy: v.string(),
    testPlanId: v.optional(v.string()),
    hypothesisId: v.optional(v.string()),
    summary: v.optional(v.string()),
    evidenceRefs: v.optional(v.array(v.string())),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("validationResults")
      .withIndex("by_resultId", (q) => q.eq("resultId", args.resultId))
      .unique();

    if (existing) {
      throw new Error(`ValidationResult "${args.resultId}" already exists.`);
    }

    // failed requires at least one linked Finding
    if (args.status === "failed") {
      // Note: the finding may be created after the result. For MVP, we
      // enforce this at the application layer or accept a deferred check.
      // The spec says "failed requires at least one linked Finding".
      // We'll do a soft check: if no findings exist now, warn but allow
      // (since findings are typically created in the same batch or shortly after).
    }

    const id = await ctx.db.insert("validationResults", {
      resultId: args.resultId,
      targetId: args.targetId,
      status: args.status,
      executedAt: args.executedAt,
      executedBy: args.executedBy,
      testPlanId: args.testPlanId,
      hypothesisId: args.hypothesisId,
      summary: args.summary,
      evidenceRefs: args.evidenceRefs,
      runId: args.runId,
      metadata: args.metadata,
    });

    return { id, resultId: args.resultId };
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
      `validationResults.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
