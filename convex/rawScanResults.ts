import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const rawScanSource = v.union(v.literal("convex"), v.literal("fixture"));

const rawScanHeaders = v.record(v.string(), v.string());

const rawScanTls = v.object({
  valid: v.boolean(),
  expiresAt: v.optional(v.string()),
  issuer: v.optional(v.string()),
});

const rawScanCms = v.object({
  name: v.union(
    v.literal("wordpress"),
    v.literal("joomla"),
    v.literal("drupal"),
    v.literal("unknown"),
  ),
  version: v.optional(v.string()),
  confidence: v.number(),
  evidence: v.array(v.string()),
});

const rawScanAdminExposure = v.object({
  path: v.string(),
  method: v.optional(v.union(v.literal("HEAD"), v.literal("GET"))),
  reachable: v.boolean(),
  httpStatus: v.optional(v.number()),
  finalUrl: v.optional(v.string()),
});

const rawScanError = v.object({
  stage: v.union(
    v.literal("http"),
    v.literal("tls"),
    v.literal("cms"),
    v.literal("admin-exposure"),
  ),
  message: v.string(),
});

const rawScanInput = v.object({
  municipalityExternalId: v.string(),
  source: rawScanSource,
  requestedUrl: v.string(),
  scannedAt: v.string(),
  reachable: v.boolean(),
  finalUrl: v.optional(v.string()),
  httpStatus: v.optional(v.number()),
  headers: rawScanHeaders,
  tls: v.optional(rawScanTls),
  cms: v.optional(rawScanCms),
  adminExposure: v.array(rawScanAdminExposure),
  errors: v.array(rawScanError),
});

export const upsertMany = internalMutation({
  args: { results: v.array(rawScanInput) },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    const missingMunicipalities: string[] = [];

    for (const result of args.results) {
      const municipality = await ctx.db
        .query("municipalities")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", result.municipalityExternalId),
        )
        .unique();

      if (!municipality) {
        missingMunicipalities.push(result.municipalityExternalId);
        continue;
      }

      const existing = await ctx.db
        .query("rawScanResults")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", result.municipalityExternalId),
        )
        .unique();

      const document = {
        externalId: result.municipalityExternalId,
        municipalityId: municipality._id,
        source: result.source,
        requestedUrl: result.requestedUrl,
        scannedAt: result.scannedAt,
        reachable: result.reachable,
        finalUrl: result.finalUrl,
        httpStatus: result.httpStatus,
        headers: result.headers,
        tls: result.tls,
        cms: result.cms,
        adminExposure: result.adminExposure,
        errors: result.errors,
      };

      if (existing) {
        await ctx.db.replace(existing._id, document);
        updated += 1;
      } else {
        await ctx.db.insert("rawScanResults", document);
        inserted += 1;
      }
    }

    return {
      inserted,
      updated,
      skippedMissingMunicipalities: missingMunicipalities.length,
      missingMunicipalities,
      total: args.results.length,
    };
  },
});

export const latestByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rawScanResults")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});

export const listLatest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rawScanResults")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
