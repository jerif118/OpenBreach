import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireOperatorOrAdmin } from "./auth";

const severity = v.union(v.literal("info"), v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"));

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

const reportStatus = v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"));

const generatedBy = v.union(v.literal("deterministic-fallback"), v.literal("ai-provider"));

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
      .withIndex("by_municipalityId_and_generatedAt", (q) => q.eq("municipalityId", args.municipalityId))
      .order("desc")
      .take(1);

    return reports[0] ?? null;
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
      if (!args.summary || !args.priorityActions || !args.findings || !args.generatedBy || !args.pdf || !args.artifacts) {
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
