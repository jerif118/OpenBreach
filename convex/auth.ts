import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const ROLES = {
  viewer: "viewer",
  operator: "operator",
  admin: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

type AuthCtx = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;

export async function getCurrentUserProfile(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  return { identity, profile };
}

export async function requireAuthenticatedProfile(
  ctx: AuthCtx,
): Promise<Doc<"userProfiles">> {
  const current = await getCurrentUserProfile(ctx);

  if (!current) {
    throw new Error("Authentication required.");
  }

  if (!current.profile) {
    throw new Error("Authorized user profile required.");
  }

  return current.profile;
}

export async function requireAnyRole(
  ctx: AuthCtx,
  allowedRoles: readonly Role[],
) {
  const profile = await requireAuthenticatedProfile(ctx);

  if (!profile.roles.some((role) => allowedRoles.includes(role))) {
    throw new Error("Insufficient permissions.");
  }

  return profile;
}

export async function requireAdmin(ctx: AuthCtx) {
  return await requireAnyRole(ctx, [ROLES.admin]);
}

export async function requireOperatorOrAdmin(ctx: AuthCtx) {
  return await requireAnyRole(ctx, [ROLES.operator, ROLES.admin]);
}
