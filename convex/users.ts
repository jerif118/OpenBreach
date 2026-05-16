import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserProfile, requireAdmin, ROLES } from "./auth";

const profileRole = v.union(v.literal("viewer"), v.literal("operator"), v.literal("admin"));

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
