import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type DatabaseReader,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin, requireApprover } from "./auth";
import type { TestPlanDto, TestPlanStatus } from "./types/testPlans";
import { validateTestPlanTransition } from "./lib/stateMachine";

const MAX_LIST_LIMIT = 100;
const APPROVAL_REQUIRED_STATUSES = new Set<TestPlanStatus>([
  "approved",
  "executing",
  "completed",
]);

const testPlanStatus = v.union(
  v.literal("draft"),
  v.literal("pending-approval"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("executing"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const testStep = v.object({
  stepId: v.string(),
  description: v.string(),
  expectedOutcome: v.optional(v.string()),
});

function toTestPlanDto(doc: Doc<"testPlans">): TestPlanDto {
  return {
    planId: doc.planId,
    targetId: doc.targetId,
    title: doc.title,
    status: doc.status,
    createdAt: doc.createdAt,
    steps: doc.steps.map((s) => ({
      stepId: s.stepId,
      description: s.description,
      expectedOutcome: s.expectedOutcome ?? undefined,
    })),
    hypothesisIds: doc.hypothesisIds ?? undefined,
    approver: doc.approver ?? undefined,
    approvedAt: doc.approvedAt ?? undefined,
    estimatedDurationMinutes: doc.estimatedDurationMinutes ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
    stepCount: doc.steps.length,
  };
}

export const listByTarget = internalQuery({
  args: {
    targetId: v.string(),
    status: v.optional(testPlanStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    if (args.status) {
      const status = args.status;
      const docs = await ctx.db
        .query("testPlans")
        .withIndex("by_targetId_and_status", (q) =>
          q.eq("targetId", args.targetId).eq("status", status),
        )
        .take(limit);

      return docs.map(toTestPlanDto);
    }

    const query = ctx.db
      .query("testPlans")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId));

    const docs = await query.take(limit);
    return docs.map(toTestPlanDto);
  },
});

export const get = internalQuery({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const doc = await getTestPlanByPlanId(ctx, args.planId);

    return doc ? toTestPlanDto(doc) : null;
  },
});

export const create = internalMutation({
  args: {
    planId: v.string(),
    targetId: v.string(),
    title: v.string(),
    status: testPlanStatus,
    createdAt: v.string(),
    steps: v.array(testStep),
    hypothesisIds: v.optional(v.array(v.string())),
    approver: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    estimatedDurationMinutes: v.optional(v.number()),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await getTestPlanByPlanId(ctx, args.planId);

    if (existing) {
      throw new Error(`TestPlan "${args.planId}" already exists.`);
    }

    const id = await ctx.db.insert("testPlans", {
      planId: args.planId,
      targetId: args.targetId,
      title: args.title,
      status: args.status,
      createdAt: args.createdAt,
      steps: args.steps,
      hypothesisIds: args.hypothesisIds,
      approver: args.approver,
      approvedAt: args.approvedAt,
      estimatedDurationMinutes: args.estimatedDurationMinutes,
      runId: args.runId,
      metadata: args.metadata,
    });

    return { id, planId: args.planId };
  },
});

export const update = internalMutation({
  args: {
    planId: v.string(),
    title: v.optional(v.string()),
    status: v.optional(testPlanStatus),
    steps: v.optional(v.array(testStep)),
    hypothesisIds: v.optional(v.array(v.string())),
    approver: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    estimatedDurationMinutes: v.optional(v.number()),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const doc = await getTestPlanByPlanId(ctx, args.planId);

    if (!doc) {
      throw new Error(`TestPlan "${args.planId}" not found.`);
    }

    const patch: Partial<Doc<"testPlans">> = {};

    if (args.title !== undefined) patch.title = args.title;
    if (args.steps !== undefined) patch.steps = args.steps;
    if (args.hypothesisIds !== undefined)
      patch.hypothesisIds = args.hypothesisIds;
    if (args.estimatedDurationMinutes !== undefined)
      patch.estimatedDurationMinutes = args.estimatedDurationMinutes;
    if (args.runId !== undefined) patch.runId = args.runId;
    if (args.metadata !== undefined) patch.metadata = args.metadata;

    if (args.status !== undefined) {
      validateTestPlanTransition(doc.status, args.status);
      patch.status = args.status;
      requireApprovalFields(args.status, args, doc);
    }

    if (args.approver !== undefined) patch.approver = args.approver;
    if (args.approvedAt !== undefined) patch.approvedAt = args.approvedAt;

    await ctx.db.patch(doc._id, patch);
    return { id: doc._id, planId: args.planId };
  },
});

export const approve = internalMutation({
  args: {
    planId: v.string(),
    approver: v.string(),
    approvedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await requireApprover(ctx);

    const doc = await getTestPlanByPlanId(ctx, args.planId);

    if (!doc) {
      throw new Error(`TestPlan "${args.planId}" not found.`);
    }

    validateTestPlanTransition(doc.status, "approved");

    await ctx.db.patch(doc._id, {
      status: "approved",
      approver: args.approver,
      approvedAt: args.approvedAt,
    });

    return { id: doc._id, planId: args.planId };
  },
});

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return MAX_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `testPlans.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}

async function getTestPlanByPlanId(
  ctx: { db: DatabaseReader },
  planId: string,
) {
  return await ctx.db
    .query("testPlans")
    .withIndex("by_planId", (q) => q.eq("planId", planId))
    .unique();
}

function requireApprovalFields(
  status: TestPlanStatus,
  args: { approver?: string; approvedAt?: string },
  doc: Doc<"testPlans">,
) {
  if (!APPROVAL_REQUIRED_STATUSES.has(status)) {
    return;
  }
  if (!args.approver && !doc.approver) {
    throw new Error(`TestPlan status "${status}" requires an approver.`);
  }
  if (!args.approvedAt && !doc.approvedAt) {
    throw new Error(`TestPlan status "${status}" requires approvedAt.`);
  }
}
