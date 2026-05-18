import { v } from "convex/values";
import { internalMutation, query, mutation } from "./_generated/server";
import { requireOperatorOrAdmin } from "./auth";

const severity = v.union(
  v.literal("info"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const reportFinding = v.object({
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
  confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  status: v.union(
    v.literal("confirmed"),
    v.literal("likely"),
    v.literal("observed"),
    v.literal("skipped"),
    v.literal("unresolved"),
  ),
  affectedAssets: v.array(v.string()),
  evidenceSummary: v.string(),
  remediationSteps: v.array(v.string()),
  verificationSteps: v.array(v.string()),
});

const reportStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
);

const generatedBy = v.union(
  v.literal("deterministic-fallback"),
  v.literal("ai-provider"),
);

const reportPdfReference = v.object({
  storagePath: v.string(),
  fileName: v.string(),
  contentType: v.literal("application/pdf"),
  generatedAt: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
});

const reportArtifactReference = v.object({
  variant: v.union(v.literal("technical"), v.literal("friendly")),
  label: v.string(),
  pdf: reportPdfReference,
});

const reportArtifacts = v.object({
  technical: v.optional(reportArtifactReference),
  friendly: v.optional(reportArtifactReference),
});

export const getForMunicipality = query({
  args: { municipalityId: v.id("municipalities") },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("remediationReports")
      .withIndex("by_municipalityId_and_generatedAt", (q) =>
        q.eq("municipalityId", args.municipalityId),
      )
      .order("desc")
      .take(1);

    return reports[0] ?? null;
  },
});

// Read-side composition of a single remediation report joined with the
// municipality and the scan that produced it. The printable
// `/reports/$reportId` route consumes this view to render a self-contained
// report page that can be exported to PDF via the browser print dialog.
export const getDetail = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("remediationReports")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!report) {
      return null;
    }

    const municipality = await ctx.db.get(report.municipalityId);
    if (!municipality) {
      return null;
    }

    const scan = report.scanResultId
      ? await ctx.db.get(report.scanResultId)
      : null;

    return {
      report: {
        externalId: report.externalId,
        status: report.status,
        generatedAt: report.generatedAt,
        updatedAt: report.updatedAt,
        summary: report.summary,
        priorityActions: report.priorityActions,
        findings: report.findings,
        generatedBy: report.generatedBy,
        pdf: report.pdf,
        artifacts: report.artifacts,
        error: report.error,
      },
      municipality: {
        id: municipality.externalId,
        name: municipality.name,
        state: municipality.state,
        websiteUrl: municipality.websiteUrl,
        population: municipality.population,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
        sourceUrl: municipality.sourceUrl,
        riskTier: municipality.riskTier,
      },
      scan: scan
        ? {
            externalId: scan.externalId,
            scannedAt: scan.scannedAt,
            requestedUrl: scan.requestedUrl,
            finalUrl: scan.finalUrl,
            reachable: scan.reachable,
            httpStatus: scan.httpStatus,
            headers: scan.headers,
            tls: scan.tls,
            cms: scan.cms,
            adminExposure: scan.adminExposure,
            errors: scan.errors,
            riskScore: scan.riskScore,
            riskLevel: scan.riskLevel,
            findings: scan.findings,
          }
        : null,
    };
  },
});

export const persistGenerated = mutation({
  args: {
    municipalityId: v.id("municipalities"),
    externalId: v.string(),
    scanResultId: v.optional(v.id("scanResults")),
    status: reportStatus,
    generatedAt: v.string(),
    summary: v.optional(v.string()),
    priorityActions: v.optional(v.array(v.string())),
    findings: v.optional(v.array(reportFinding)),
    generatedBy: v.optional(generatedBy),
    pdf: v.optional(reportPdfReference),
    artifacts: v.optional(reportArtifacts),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    if (args.status === "completed") {
      if (
        !args.summary ||
        !args.priorityActions ||
        !args.findings ||
        !args.generatedBy ||
        !args.pdf ||
        !args.artifacts
      ) {
        throw new Error(
          "Completed reports require summary, priority actions, findings, generator metadata, and both PDF artifact references.",
        );
      }
    }

    if (args.status === "failed" && !args.error) {
      throw new Error("Failed reports require an error message.");
    }

    return await ctx.db.insert("remediationReports", {
      externalId: args.externalId,
      municipalityId: args.municipalityId,
      scanResultId: args.scanResultId,
      status: args.status,
      generatedAt: args.generatedAt,
      updatedAt: new Date().toISOString(),
      summary: args.summary,
      priorityActions: args.priorityActions,
      findings: args.findings,
      generatedBy: args.generatedBy,
      pdf: args.pdf,
      artifacts: args.artifacts,
      error: args.error,
    });
  },
});

// Dev-only seed path: looks up live `municipalities` and `scanResults` rows by
// their fixture externalIds and upserts a `remediationReports` row keyed by
// `externalId`. Internal mutation so it bypasses Clerk auth and can only be
// invoked from `npx convex run`, not from the public client. Use the operator
// path (`reports.persistGenerated`) in production.
export const seedFromFixture = internalMutation({
  args: {
    results: v.array(
      v.object({
        externalId: v.string(),
        municipalityExternalId: v.string(),
        scanResultExternalId: v.optional(v.string()),
        status: reportStatus,
        generatedAt: v.string(),
        summary: v.optional(v.string()),
        priorityActions: v.optional(v.array(v.string())),
        findings: v.optional(v.array(reportFinding)),
        generatedBy: v.optional(generatedBy),
        pdf: v.optional(reportPdfReference),
        artifacts: v.optional(reportArtifacts),
        error: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    const missingMunicipalities: string[] = [];
    const now = new Date().toISOString();

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

      const latestScans = await ctx.db
        .query("scanResults")
        .withIndex("by_municipalityId_and_scannedAt", (q) =>
          q.eq("municipalityId", municipality._id),
        )
        .order("desc")
        .take(1);

      const document = {
        externalId: result.externalId,
        municipalityId: municipality._id,
        scanResultId: latestScans[0]?._id,
        status: result.status,
        generatedAt: result.generatedAt,
        updatedAt: now,
        summary: result.summary,
        priorityActions: result.priorityActions,
        findings: result.findings,
        generatedBy: result.generatedBy,
        pdf: result.pdf,
        artifacts: result.artifacts,
        error: result.error,
      };

      const existing = await ctx.db
        .query("remediationReports")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", result.externalId),
        )
        .unique();

      if (existing) {
        await ctx.db.replace(existing._id, document);
        updated += 1;
      } else {
        await ctx.db.insert("remediationReports", document);
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

export const createPlaceholder = mutation({
  args: {
    municipalityId: v.id("municipalities"),
    externalId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    return await ctx.db.insert("remediationReports", {
      externalId: args.externalId,
      municipalityId: args.municipalityId,
      status: "pending",
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: args.summary,
      priorityActions: [],
      findings: [],
      generatedBy: "deterministic-fallback",
    });
  },
});
