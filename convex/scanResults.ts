import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const severity = v.union(v.literal("info"), v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"));
const riskLevel = v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"));

const finding = v.object({
  id: v.string(),
  category: v.union(
    v.literal("tls"),
    v.literal("headers"),
    v.literal("cms"),
    v.literal("exposure"),
    v.literal("admin-exposure"),
    v.literal("availability"),
    v.literal("known-vulnerability"),
  ),
  severity,
  title: v.string(),
  description: v.string(),
  evidence: v.string(),
  remediationHint: v.string(),
});

const rawScanHeaders = v.record(v.string(), v.string());

const rawScanTls = v.object({
  valid: v.boolean(),
  expiresAt: v.optional(v.string()),
  issuer: v.optional(v.string()),
});

const rawScanCms = v.object({
  name: v.union(v.literal("wordpress"), v.literal("joomla"), v.literal("drupal"), v.literal("unknown")),
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
  stage: v.union(v.literal("http"), v.literal("tls"), v.literal("cms"), v.literal("admin-exposure")),
  message: v.string(),
});

const enrichedScanInput = v.object({
  id: v.string(),
  municipalityExternalId: v.string(),
  scannedAt: v.string(),
  requestedUrl: v.optional(v.string()),
  finalUrl: v.optional(v.string()),
  reachable: v.optional(v.boolean()),
  httpStatus: v.optional(v.number()),
  headers: v.optional(rawScanHeaders),
  tls: v.optional(rawScanTls),
  cms: v.optional(rawScanCms),
  adminExposure: v.optional(v.array(rawScanAdminExposure)),
  errors: v.optional(v.array(rawScanError)),
  riskScore: v.number(),
  riskLevel,
  findings: v.array(finding),
  score: v.optional(v.number()),
});

export const upsertEnrichedMany = internalMutation({
  args: { results: v.array(enrichedScanInput) },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    const missingMunicipalities: string[] = [];

    for (const result of args.results) {
      const municipality = await ctx.db
        .query("municipalities")
        .withIndex("by_externalId", (q) => q.eq("externalId", result.municipalityExternalId))
        .unique();

      if (!municipality) {
        missingMunicipalities.push(result.municipalityExternalId);
        continue;
      }

      const existing = await ctx.db
        .query("scanResults")
        .withIndex("by_externalId", (q) => q.eq("externalId", result.municipalityExternalId))
        .unique();

      const document = {
        externalId: result.municipalityExternalId,
        municipalityId: municipality._id,
        scannedAt: result.scannedAt,
        requestedUrl: result.requestedUrl,
        finalUrl: result.finalUrl,
        reachable: result.reachable,
        httpStatus: result.httpStatus,
        headers: result.headers,
        tls: result.tls,
        cms: result.cms,
        adminExposure: result.adminExposure,
        errors: result.errors,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        findings: result.findings,
        score: result.score,
      };

      if (existing) {
        await ctx.db.replace(existing._id, document);
        updated += 1;
      } else {
        await ctx.db.insert("scanResults", document);
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
      .query("scanResults")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});

export const latestByMunicipalityId = query({
  args: { municipalityId: v.id("municipalities") },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("scanResults")
      .withIndex("by_municipalityId_and_scannedAt", (q) => q.eq("municipalityId", args.municipalityId))
      .order("desc")
      .take(1);

    return results[0] ?? null;
  },
});

export const listLatest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("scanResults").order("desc").take(args.limit ?? 50);
  },
});
