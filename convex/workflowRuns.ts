import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin } from "./auth";
import type { WorkflowRunDto } from "./types/workflow";
import { validateWorkflowRunTransition } from "./lib/stateMachine";
import { appendAuditEvent } from "./lib/audit";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toWorkflowRunDto(doc: Doc<"workflowRuns">): WorkflowRunDto {
  const durationMs =
    doc.completedAt || doc.abortedAt
      ? new Date(doc.completedAt ?? doc.abortedAt!).getTime() -
        new Date(doc.startedAt).getTime()
      : undefined;

  return {
    runId: doc.runId,
    targetId: doc.targetId,
    status: doc.status,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt ?? undefined,
    abortedAt: doc.abortedAt ?? undefined,
    abortedReason: doc.abortedReason ?? undefined,
    currentPhase: doc.currentPhase ?? undefined,
    phases: doc.phases
      ? doc.phases.map((p) => ({
          phase: p.phase,
          enteredAt: p.enteredAt,
          exitedAt: p.exitedAt ?? undefined,
          rejectionReason: p.rejectionReason ?? undefined,
        }))
      : undefined,
    durationMs,
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    const docs = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .order("desc")
      .take(limit);

    return docs.map(toWorkflowRunDto);
  },
});

export const get = internalQuery({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .unique();

    return doc ? toWorkflowRunDto(doc) : null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    runId: v.string(),
    targetId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("halted"),
      v.literal("rejected"),
      v.literal("failed"),
    ),
    startedAt: v.string(),
    currentPhase: v.optional(
      v.union(
        v.literal("intake"),
        v.literal("passive-scan"),
        v.literal("hypothesis"),
        v.literal("test-planning"),
        v.literal("approval"),
        v.literal("execution"),
        v.literal("validation"),
        v.literal("reporting"),
        v.literal("archived"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const actor = await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .unique();

    if (existing) {
      throw new Error(`WorkflowRun "${args.runId}" already exists.`);
    }

    const phases = args.currentPhase
      ? [
          {
            phase: args.currentPhase,
            enteredAt: args.startedAt,
          },
        ]
      : undefined;

    const id = await ctx.db.insert("workflowRuns", {
      runId: args.runId,
      targetId: args.targetId,
      status: args.status,
      startedAt: args.startedAt,
      currentPhase: args.currentPhase,
      phases,
    });

    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "workflow-started",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: args.runId,
      details: { status: args.status, phase: args.currentPhase ?? null },
    });

    return { id, runId: args.runId };
  },
});

export const updatePhase = internalMutation({
  args: {
    runId: v.string(),
    newPhase: v.union(
      v.literal("intake"),
      v.literal("passive-scan"),
      v.literal("hypothesis"),
      v.literal("test-planning"),
      v.literal("approval"),
      v.literal("execution"),
      v.literal("validation"),
      v.literal("reporting"),
      v.literal("archived"),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireOperatorOrAdmin(ctx);

    const doc = await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .unique();

    if (!doc) {
      throw new Error(`WorkflowRun "${args.runId}" not found.`);
    }

    const now = new Date().toISOString();
    const phases = doc.phases ? [...doc.phases] : [];

    // Exit current phase
    if (phases.length > 0) {
      phases[phases.length - 1] = {
        ...phases[phases.length - 1],
        exitedAt: now,
      };
    }

    // Enter new phase
    phases.push({
      phase: args.newPhase,
      enteredAt: now,
      rejectionReason: args.reason ?? undefined,
    });

    await ctx.db.patch(doc._id, {
      currentPhase: args.newPhase,
      phases,
    });

    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: "phase-changed",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: args.runId,
      details: { phase: args.newPhase, reason: args.reason ?? null },
    });

    return { id: doc._id, runId: args.runId };
  },
});

export const updateStatus = internalMutation({
  args: {
    runId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("halted"),
      v.literal("rejected"),
      v.literal("failed"),
    ),
    completedAt: v.optional(v.string()),
    abortedAt: v.optional(v.string()),
    abortedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireOperatorOrAdmin(ctx);

    const doc = await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .unique();

    if (!doc) {
      throw new Error(`WorkflowRun "${args.runId}" not found.`);
    }

    validateWorkflowRunTransition(doc.status, args.status);

    const patch: Partial<Doc<"workflowRuns">> = {
      status: args.status,
    };

    if (args.completedAt !== undefined) patch.completedAt = args.completedAt;
    if (args.abortedAt !== undefined) patch.abortedAt = args.abortedAt;
    if (args.abortedReason !== undefined)
      patch.abortedReason = args.abortedReason;

    await ctx.db.patch(doc._id, patch);

    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: workflowStatusAuditEvent(args.status),
      actor: actor.name ?? actor.tokenIdentifier,
      runId: args.runId,
      details: { status: args.status, reason: args.abortedReason ?? null },
    });

    return { id: doc._id, runId: args.runId };
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
      `workflowRuns.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}

function workflowStatusAuditEvent(status: Doc<"workflowRuns">["status"]) {
  if (status === "pending") {
    return "workflow-pending" as const;
  }
  if (status === "running") {
    return "workflow-running" as const;
  }
  if (status === "paused") {
    return "workflow-paused" as const;
  }
  if (status === "completed") {
    return "workflow-completed" as const;
  }
  if (status === "halted") {
    return "workflow-halted" as const;
  }
  if (status === "rejected") {
    return "workflow-rejected" as const;
  }
  return "workflow-failed" as const;
}
