import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type RunSummaryDTO = {
  runId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function toRunSummaryDTO(run: Doc<"workflowRuns">): RunSummaryDTO {
  return {
    runId: run.runId,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────

/**
 * workflowRuns.listByTarget — Returns workflow run summaries for a target.
 * Fixture fallback: returns empty array when CONVEX_URL is not set.
 */
export const listByTarget = query({
  args: { targetId: v.string() },
  handler: async (ctx, args): Promise<RunSummaryDTO[]> => {
    if (!process.env.CONVEX_URL) {
      return [];
    }

    const runs = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .order("desc")
      .take(50);

    return runs.map(toRunSummaryDTO);
  },
});

// ─────────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────────

type RunStatus =
  | "hypothesis"
  | "approved"
  | "confirmed"
  | "skipped"
  | "halted"
  | "rejected";

const VALID_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  hypothesis: ["approved", "halted", "rejected"],
  approved: ["confirmed", "halted", "rejected"],
  confirmed: [], // terminal
  skipped: [], // terminal
  halted: ["approved"], // can restart
  rejected: [], // terminal
};

function validateTransition(current: RunStatus, next: RunStatus): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid state transition from ${current} to ${next}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * workflowRuns.upsert — Creates or updates a workflow run with state machine validation.
 * Uses by_runId index to check for existing documents.
 */
export const upsert = internalMutation({
  args: {
    run: v.object({
      runId: v.string(),
      scopeId: v.string(),
      targetId: v.string(),
      status: v.union(
        v.literal("hypothesis"),
        v.literal("approved"),
        v.literal("confirmed"),
        v.literal("skipped"),
        v.literal("halted"),
        v.literal("rejected"),
      ),
      hypothesisId: v.optional(v.string()),
      testPlanId: v.optional(v.string()),
      startedAt: v.string(),
      completedAt: v.optional(v.string()),
      agentId: v.string(),
      evidenceEnvelopeId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", args.run.runId))
      .unique();

    if (existing) {
      // Validate state transition
      validateTransition(existing.status as RunStatus, args.run.status);
      // Update existing document
      await ctx.db.patch(existing._id, {
        scopeId: args.run.scopeId,
        targetId: args.run.targetId,
        status: args.run.status,
        hypothesisId: args.run.hypothesisId,
        testPlanId: args.run.testPlanId,
        startedAt: args.run.startedAt,
        completedAt: args.run.completedAt,
        agentId: args.run.agentId,
        evidenceEnvelopeId: args.run.evidenceEnvelopeId,
      });
      return { success: true, runId: existing._id };
    } else {
      // Insert new document
      const id = await ctx.db.insert("workflowRuns", {
        runId: args.run.runId,
        scopeId: args.run.scopeId,
        targetId: args.run.targetId,
        status: args.run.status,
        hypothesisId: args.run.hypothesisId,
        testPlanId: args.run.testPlanId,
        startedAt: args.run.startedAt,
        completedAt: args.run.completedAt,
        agentId: args.run.agentId,
        evidenceEnvelopeId: args.run.evidenceEnvelopeId,
      });
      return { success: true, runId: id };
    }
  },
});