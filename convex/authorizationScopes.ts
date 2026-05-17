import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireOperatorOrAdmin, requireAdmin } from "./auth";
import type { AuthorizationScopeDto } from "./types/authorization";

const MAX_LIST_LIMIT = 100;

// ============================================================================
// DTO Mapper
// ============================================================================

function toAuthorizationScopeDto(
  doc: Doc<"authorizationScopes">,
): AuthorizationScopeDto {
  const now = new Date().toISOString();
  return {
    authorizationId: doc.authorizationId,
    targetId: doc.targetId,
    scopeType: doc.scopeType,
    grantedBy: doc.grantedBy,
    grantedAt: doc.grantedAt,
    expiresAt: doc.expiresAt ?? undefined,
    constraints: doc.constraints ?? undefined,
    evidenceUrl: doc.evidenceUrl ?? undefined,
    isExpired: doc.expiresAt ? doc.expiresAt < now : false,
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
      .query("authorizationScopes")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .take(limit);

    return docs.map(toAuthorizationScopeDto);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    authorizationId: v.string(),
    targetId: v.string(),
    scopeType: v.union(
      v.literal("full"),
      v.literal("passive-only"),
      v.literal("limited"),
      v.literal("time-bound"),
    ),
    grantedBy: v.string(),
    grantedAt: v.string(),
    expiresAt: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
    evidenceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("authorizationScopes")
      .withIndex("by_authorizationId", (q) =>
        q.eq("authorizationId", args.authorizationId),
      )
      .unique();

    if (existing) {
      throw new Error(
        `AuthorizationScope "${args.authorizationId}" already exists.`,
      );
    }

    const id = await ctx.db.insert("authorizationScopes", {
      authorizationId: args.authorizationId,
      targetId: args.targetId,
      scopeType: args.scopeType,
      grantedBy: args.grantedBy,
      grantedAt: args.grantedAt,
      expiresAt: args.expiresAt,
      constraints: args.constraints,
      evidenceUrl: args.evidenceUrl,
    });

    return { id, authorizationId: args.authorizationId };
  },
});

export const revoke = internalMutation({
  args: {
    authorizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const doc = await ctx.db
      .query("authorizationScopes")
      .withIndex("by_authorizationId", (q) =>
        q.eq("authorizationId", args.authorizationId),
      )
      .unique();

    if (!doc) {
      throw new Error(
        `AuthorizationScope "${args.authorizationId}" not found.`,
      );
    }

    await ctx.db.delete(doc._id);
    return { id: doc._id, authorizationId: args.authorizationId };
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
      `authorizationScopes.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
