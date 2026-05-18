import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 50;

const fallbackRiskScoreByTier = {
  low: 0,
  medium: 25,
  high: 50,
  critical: 75,
} as const;

const riskTier = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const seedMunicipality = v.object({
  id: v.string(),
  name: v.string(),
  state: v.string(),
  population: v.number(),
  websiteUrl: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  sourceUrl: v.string(),
  riskTier,
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);
    const municipalities = await ctx.db
      .query("municipalities")
      .take(MAX_LIST_LIMIT);
    const items = [];

    for (const municipality of municipalities) {
      const latestScans = await ctx.db
        .query("scanResults")
        .withIndex("by_municipalityId_and_scannedAt", (q) =>
          q.eq("municipalityId", municipality._id),
        )
        .order("desc")
        .take(1);

      items.push(toListItem(municipality, latestScans[0] ?? null));
    }

    return items.sort(compareListItems).slice(0, limit);
  },
});

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `municipalities.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }

  return limit;
}

function toListItem(
  municipality: Doc<"municipalities">,
  scan: Doc<"scanResults"> | null,
) {
  return {
    ...toMunicipalityContract(municipality),
    riskScore:
      riskScoreFromScan(scan) ?? fallbackRiskScoreByTier[municipality.riskTier],
    riskLevel: scan?.riskLevel ?? municipality.riskTier,
  };
}

function toMunicipalityContract(municipality: Doc<"municipalities">) {
  return {
    id: municipality.externalId,
    name: municipality.name,
    state: municipality.state,
    websiteUrl: municipality.websiteUrl,
    population: municipality.population,
    latitude: municipality.latitude,
    longitude: municipality.longitude,
    sourceUrl: municipality.sourceUrl,
    riskTier: municipality.riskTier,
  };
}

function toScanResultContract(
  municipality: Doc<"municipalities">,
  scan: Doc<"scanResults"> | null,
) {
  if (scan === null) {
    return null;
  }

  return {
    id: scan.externalId,
    municipalityId: municipality.externalId,
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
    riskScore:
      riskScoreFromScan(scan) ?? fallbackRiskScoreByTier[municipality.riskTier],
    riskLevel: scan.riskLevel ?? municipality.riskTier,
    findings: scan.findings,
    score: scan.score,
  };
}

function toReportMetadataContract(
  municipality: Doc<"municipalities">,
  report: Doc<"remediationReports"> | null,
) {
  if (report === null) {
    return null;
  }

  const metadata = {
    reportId: report.externalId,
    municipalityId: municipality.externalId,
    generatedAt: report.generatedAt,
    updatedAt: report.updatedAt,
    pdf: report.pdf,
    artifacts: report.artifacts,
  };

  if (report.status === "failed") {
    return {
      ...metadata,
      status: report.status,
      error: report.error ?? "Report generation failed.",
    };
  }

  return {
    ...metadata,
    status: report.status,
  };
}

function riskScoreFromScan(scan: Doc<"scanResults"> | null) {
  if (scan === null || scan.riskScore === undefined) {
    return null;
  }

  if (
    !Number.isFinite(scan.riskScore) ||
    scan.riskScore < 0 ||
    scan.riskScore > 100
  ) {
    return null;
  }

  return scan.riskScore;
}

function compareListItems(
  left: ReturnType<typeof toListItem>,
  right: ReturnType<typeof toListItem>,
) {
  return (
    right.riskScore - left.riskScore ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id)
  );
}

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const municipality = await ctx.db
      .query("municipalities")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.id))
      .unique();

    if (municipality === null) {
      return null;
    }

    const latestScans = await ctx.db
      .query("scanResults")
      .withIndex("by_municipalityId_and_scannedAt", (q) =>
        q.eq("municipalityId", municipality._id),
      )
      .order("desc")
      .take(1);

    const latestReports = await ctx.db
      .query("remediationReports")
      .withIndex("by_municipalityId_and_generatedAt", (q) =>
        q.eq("municipalityId", municipality._id),
      )
      .order("desc")
      .take(1);

    return {
      municipality: toMunicipalityContract(municipality),
      scan: toScanResultContract(municipality, latestScans[0] ?? null),
      report: toReportMetadataContract(municipality, latestReports[0] ?? null),
    };
  },
});

const PIPELINE_MAX_LIMIT = 200;
const PIPELINE_DEFAULT_LIMIT = 100;

// Joined view of the municipality pipeline used by the Open Breach dashboard.
// Returns each municipality with its latest passive scan and latest remediation
// report so the client can render evidence, findings, and report artifacts in
// one fetch without per-target round trips.
export const listPipeline = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = normalizePipelineLimit(args.limit);
    const municipalities = await ctx.db
      .query("municipalities")
      .take(PIPELINE_MAX_LIMIT);
    const entries: PipelineEntry[] = [];

    for (const municipality of municipalities) {
      const [latestScan] = await ctx.db
        .query("scanResults")
        .withIndex("by_municipalityId_and_scannedAt", (q) =>
          q.eq("municipalityId", municipality._id),
        )
        .order("desc")
        .take(1);

      const [latestReport] = await ctx.db
        .query("remediationReports")
        .withIndex("by_municipalityId_and_generatedAt", (q) =>
          q.eq("municipalityId", municipality._id),
        )
        .order("desc")
        .take(1);

      entries.push({
        municipality: toMunicipalityContract(municipality),
        scan: toScanResultContract(municipality, latestScan ?? null),
        report: toPipelineReportContract(municipality, latestReport ?? null),
        scannedAtFallback: latestScan?._creationTime ?? null,
        reportedAtFallback: latestReport?._creationTime ?? null,
      });
    }

    return entries.sort(comparePipelineEntries).slice(0, limit);
  },
});

type PipelineEntry = {
  municipality: ReturnType<typeof toMunicipalityContract>;
  scan: ReturnType<typeof toScanResultContract>;
  report: ReturnType<typeof toPipelineReportContract>;
  scannedAtFallback: number | null;
  reportedAtFallback: number | null;
};

function normalizePipelineLimit(limit: number | undefined) {
  if (limit === undefined) {
    return PIPELINE_DEFAULT_LIMIT;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > PIPELINE_MAX_LIMIT) {
    throw new Error(
      `municipalities.listPipeline limit must be an integer from 1 to ${PIPELINE_MAX_LIMIT}.`,
    );
  }

  return limit;
}

function toPipelineReportContract(
  municipality: Doc<"municipalities">,
  report: Doc<"remediationReports"> | null,
) {
  if (report === null) {
    return null;
  }

  return {
    externalId: report.externalId,
    municipalityId: municipality.externalId,
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
  };
}

function comparePipelineEntries(left: PipelineEntry, right: PipelineEntry) {
  const reportRank = pipelineReportRank(right) - pipelineReportRank(left);
  if (reportRank !== 0) {
    return reportRank;
  }

  const riskLeft = left.scan?.riskScore ?? 0;
  const riskRight = right.scan?.riskScore ?? 0;
  if (riskRight !== riskLeft) {
    return riskRight - riskLeft;
  }

  return left.municipality.name.localeCompare(right.municipality.name);
}

function pipelineReportRank(entry: PipelineEntry) {
  if (entry.report?.status === "completed") {
    return 3;
  }
  if (entry.report) {
    return 2;
  }
  if (entry.scan) {
    return 1;
  }
  return 0;
}

// Internal seed function: callable only from `npx convex run` or other Convex
// functions, not exposed to the app's public API. App-level admin checks are
// unnecessary here because internal functions can't be reached from the client.
export const seed = internalMutation({
  args: { municipalities: v.array(seedMunicipality) },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const municipality of args.municipalities) {
      const existing = await ctx.db
        .query("municipalities")
        .withIndex("by_externalId", (q) => q.eq("externalId", municipality.id))
        .unique();

      const document = {
        externalId: municipality.id,
        name: municipality.name,
        state: municipality.state,
        websiteUrl: municipality.websiteUrl,
        population: municipality.population,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
        sourceUrl: municipality.sourceUrl,
        riskTier: municipality.riskTier,
      };

      if (existing) {
        await ctx.db.replace(existing._id, document);
        updated += 1;
      } else {
        await ctx.db.insert("municipalities", document);
        inserted += 1;
      }
    }

    return { inserted, updated, total: args.municipalities.length };
  },
});
