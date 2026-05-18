import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUserProfile, requireAdmin, ROLES } from "./auth";
import type { Doc } from "./_generated/dataModel";

const profileRole = v.union(
  v.literal("viewer"),
  v.literal("operator"),
  v.literal("admin"),
);

export const current = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUserProfile(ctx);
    return currentUser?.profile ?? null;
  },
});

export const updateCurrentMetadata = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUserProfile(ctx);
    if (!currentUser) {
      throw new Error("Authentication required.");
    }

    const metadata = {
      email: currentUser.identity.email,
      name: currentUser.identity.name,
    };

    if (currentUser.profile) {
      await ctx.db.patch(currentUser.profile._id, metadata);
      return currentUser.profile._id;
    }

    return await ctx.db.insert("userProfiles", {
      tokenIdentifier: currentUser.identity.tokenIdentifier,
      ...metadata,
      roles: [ROLES.viewer],
    });
  },
});

export const setRoles = mutation({
  args: {
    profileId: v.id("userProfiles"),
    roles: v.array(profileRole),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.profileId, { roles: args.roles });
    return args.profileId;
  },
});

// Bootstrap helper for promoting a user to admin without an existing admin.
// Internal-only: invocable from trusted contexts via `npx convex run`, never
// from the browser. Accepts any of:
//   - `tokenIdentifier`: the full Convex identity token (e.g. "https://issuer|user_abc").
//   - `clerkUserId`: the Clerk subject id (e.g. "user_2abc..."); matched as a
//     suffix on `tokenIdentifier`.
//   - `email`: exact match against the stored profile email.
//   - `profileId`: a Convex userProfiles document id.
// If `createIfMissing` is true and a `tokenIdentifier` was provided but no
// profile exists yet, a fresh admin profile is created with that token.
export const elevateToAdmin = internalMutation({
  args: {
    tokenIdentifier: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    email: v.optional(v.string()),
    profileId: v.optional(v.id("userProfiles")),
    createIfMissing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const provided =
      Number(args.tokenIdentifier ? 1 : 0) +
      Number(args.clerkUserId ? 1 : 0) +
      Number(args.email ? 1 : 0) +
      Number(args.profileId ? 1 : 0);
    if (provided !== 1) {
      throw new Error(
        "Pass exactly one of: tokenIdentifier, clerkUserId, email, profileId.",
      );
    }

    let profile: Doc<"userProfiles"> | null = null;

    if (args.profileId) {
      profile = await ctx.db.get(args.profileId);
    } else if (args.tokenIdentifier) {
      profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", args.tokenIdentifier!),
        )
        .unique();
    } else if (args.clerkUserId) {
      // No index for suffix match; userProfiles is small (one row per signed-in
      // operator), so a bounded scan is acceptable for this bootstrap tool.
      const candidates = await ctx.db.query("userProfiles").take(500);
      profile =
        candidates.find((p) =>
          p.tokenIdentifier.endsWith(`|${args.clerkUserId!}`),
        ) ?? null;
    } else if (args.email) {
      const candidates = await ctx.db.query("userProfiles").take(500);
      profile = candidates.find((p) => p.email === args.email) ?? null;
    }

    if (!profile) {
      if (args.createIfMissing && args.tokenIdentifier) {
        const id = await ctx.db.insert("userProfiles", {
          tokenIdentifier: args.tokenIdentifier,
          email: args.email,
          roles: [ROLES.admin],
        });
        const created = await ctx.db.get(id);
        return {
          status: "created" as const,
          profileId: id,
          tokenIdentifier: created!.tokenIdentifier,
          email: created!.email ?? null,
          name: created!.name ?? null,
          roles: created!.roles,
        };
      }
      throw new Error(
        "No matching userProfiles row. Sign in once (the app calls users.updateCurrentMetadata on first interaction) then re-run, or pass `createIfMissing: true` together with `tokenIdentifier`.",
      );
    }

    const nextRoles = Array.from(new Set([...profile.roles, ROLES.admin]));
    await ctx.db.patch(profile._id, { roles: nextRoles });

    return {
      status: "elevated" as const,
      profileId: profile._id,
      tokenIdentifier: profile.tokenIdentifier,
      email: profile.email ?? null,
      name: profile.name ?? null,
      roles: nextRoles,
    };
  },
});

// Read-only directory listing for the bootstrap script. Internal so it
// stays off the public API surface; the script invokes it via convex run.
export const listProfiles = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const rows = await ctx.db.query("userProfiles").take(limit);
    return rows.map((p) => ({
      profileId: p._id,
      tokenIdentifier: p.tokenIdentifier,
      email: p.email ?? null,
      name: p.name ?? null,
      roles: p.roles,
    }));
  },
});
