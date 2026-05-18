/**
 * V8-runtime helpers consumed by the Node action in
 * `convex/orchestratorActions.ts`. Kept in a separate file because actions
 * that need `"use node";` cannot co-locate queries or mutations.
 *
 * - `loadPipelineEntry` returns the same `listPipeline` row the CLI uses,
 *   filtered to a single externalId so the action does not need to ship the
 *   full list back to the Node runtime.
 * - `getProfileByTokenIdentifier` loads `userProfiles` by Convex identity token.
 *   The Node action reads identity via `ctx.auth.getUserIdentity()` and passes
 *   the token here so auth does not rely on nested-query identity propagation.
 */

import { v } from "convex/values";

import { internalQuery } from "./_generated/server";

// Returns the userProfiles row for a given tokenIdentifier WITHOUT performing
// an auth check. Auth is enforced by the calling action via
// `ctx.auth.getUserIdentity()` so we don't depend on Convex propagating the
// identity through `ctx.runQuery`, which can race with websocket reconnects
// (especially right after a `convex dev` restart).
export const getProfileByTokenIdentifier = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();

    if (!profile) {
      return null;
    }

    return {
      profileId: profile._id,
      tokenIdentifier: profile.tokenIdentifier,
      name: profile.name ?? null,
      email: profile.email ?? null,
      roles: profile.roles,
    };
  },
});

export const loadPipelineEntry = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const municipality = await ctx.db
      .query("municipalities")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!municipality) {
      return null;
    }

    const [latestScan] = await ctx.db
      .query("scanResults")
      .withIndex("by_municipalityId_and_scannedAt", (q) =>
        q.eq("municipalityId", municipality._id),
      )
      .order("desc")
      .take(1);

    return {
      municipality: {
        id: municipality.externalId,
        name: municipality.name,
        state: municipality.state,
        websiteUrl: municipality.websiteUrl,
        population: municipality.population ?? null,
        latitude: municipality.latitude ?? null,
        longitude: municipality.longitude ?? null,
        sourceUrl: municipality.sourceUrl ?? null,
        riskTier: municipality.riskTier,
      },
      scan: latestScan
        ? {
            id: latestScan.externalId,
            scannedAt: latestScan.scannedAt,
            requestedUrl: latestScan.requestedUrl,
            finalUrl: latestScan.finalUrl,
            reachable: latestScan.reachable,
            httpStatus: latestScan.httpStatus,
            headers: latestScan.headers,
            findings: latestScan.findings,
          }
        : null,
    };
  },
});
