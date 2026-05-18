/**
 * V8-runtime helpers consumed by the Node action in
 * `convex/orchestratorActions.ts`. Kept in a separate file because actions
 * that need `"use node";` cannot co-locate queries or mutations.
 *
 * - `loadPipelineEntry` returns the same `listPipeline` row the CLI uses,
 *   filtered to a single externalId so the action does not need to ship the
 *   full list back to the Node runtime.
 * - `requireOperatorOrAdminActor` performs the standard role check (the
 *   existing `requireOperatorOrAdmin` helper needs `ctx.db`, which actions
 *   don't have, so we expose it as an internal query the action calls).
 */

import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { requireOperatorOrAdmin } from "./auth";

export const requireOperatorOrAdminActor = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await requireOperatorOrAdmin(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const actor =
      profile.name ??
      identity?.email ??
      identity?.tokenIdentifier ??
      "operator";
    return { actor };
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
