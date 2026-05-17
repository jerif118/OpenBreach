import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireOperatorOrAdmin, requireAnyRole, ROLES } from "./auth";
import type { ApprovalGateDto } from "./types/approvals";
import type {
  DemoEvidenceSummaryDto,
  DemoTargetCardDto,
  DemoTargetDetailDto,
  DemoWorkflowRunSummaryDto,
} from "./types/demo";
import type { FindingDto } from "./types/findings";
import type { PassiveScanEvidenceDto } from "./types/passiveScan";
import type { ReportArtifactDto } from "./types/reports";
import type { TargetProfileDto } from "./types/targets";
import type { ValidationResultDto } from "./types/validation";
import type { VulnerabilityHypothesisDto } from "./types/hypotheses";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const DETAIL_SECTION_LIMIT = 25;

const riskTierValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const classificationValidator = v.union(
  v.literal("public-sector"),
  v.literal("private"),
  v.literal("infrastructure"),
  v.literal("other"),
);

const workflowRunStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("halted"),
  v.literal("rejected"),
  v.literal("failed"),
);

const workflowPhaseValidator = v.union(
  v.literal("intake"),
  v.literal("passive-scan"),
  v.literal("hypothesis"),
  v.literal("test-planning"),
  v.literal("approval"),
  v.literal("execution"),
  v.literal("validation"),
  v.literal("reporting"),
  v.literal("archived"),
);

const targetListArgsValidator = {
  limit: v.optional(v.number()),
  riskTier: v.optional(riskTierValidator),
};

const geographyValidator = v.object({
  country: v.string(),
  region: v.string(),
  city: v.string(),
});

const targetProfileValidator = v.object({
  targetId: v.string(),
  name: v.string(),
  primaryUrl: v.string(),
  riskTier: riskTierValidator,
  classification: classificationValidator,
  parentOrganization: v.optional(v.string()),
  geography: v.optional(geographyValidator),
  population: v.optional(v.number()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  metadata: v.optional(v.record(v.string(), v.any())),
});

const workflowRunSummaryValidator = v.object({
  runId: v.string(),
  status: workflowRunStatusValidator,
  currentPhase: v.optional(workflowPhaseValidator),
});

const targetCardValidator = v.object({
  targetId: v.string(),
  name: v.string(),
  primaryUrl: v.string(),
  riskTier: riskTierValidator,
  classification: classificationValidator,
  latestRun: v.union(workflowRunSummaryValidator, v.null()),
});

const evidenceSummaryValidator = v.object({
  evidenceId: v.string(),
  source: v.string(),
  collectedAt: v.string(),
  requestedUrl: v.string(),
  reachable: v.boolean(),
  httpStatus: v.optional(v.number()),
  cms: v.optional(
    v.object({
      name: v.string(),
      version: v.optional(v.string()),
      confidence: v.number(),
      evidence: v.array(v.string()),
    }),
  ),
  adminExposure: v.optional(
    v.array(
      v.object({
        path: v.string(),
        method: v.optional(v.union(v.literal("HEAD"), v.literal("GET"))),
        reachable: v.boolean(),
        httpStatus: v.optional(v.number()),
        finalUrl: v.optional(v.string()),
      }),
    ),
  ),
  runId: v.optional(v.string()),
  errorCount: v.number(),
});

const hypothesisValidator = v.object({
  hypothesisId: v.string(),
  targetId: v.string(),
  title: v.string(),
  status: v.union(
    v.literal("hypothesis"),
    v.literal("approved"),
    v.literal("confirmed"),
    v.literal("disproven"),
    v.literal("skipped"),
    v.literal("rejected"),
  ),
  createdAt: v.string(),
  proposedBy: v.string(),
  description: v.optional(v.string()),
  cweId: v.optional(v.string()),
  cvssScore: v.optional(v.number()),
  affectedComponents: v.optional(v.array(v.string())),
  prerequisites: v.optional(v.array(v.string())),
  testPlanId: v.optional(v.string()),
  runId: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
});

const approvalValidator = v.object({
  gateId: v.string(),
  targetId: v.string(),
  gateType: v.union(
    v.literal("intake"),
    v.literal("test-plan"),
    v.literal("execution"),
    v.literal("report-release"),
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("bypassed"),
  ),
  requestedAt: v.string(),
  requestedBy: v.string(),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),
  bypassJustification: v.optional(v.string()),
  linkedArtifactId: v.optional(v.string()),
  runId: v.optional(v.string()),
});

const validationResultValidator = v.object({
  resultId: v.string(),
  targetId: v.string(),
  status: v.union(
    v.literal("passed"),
    v.literal("failed"),
    v.literal("inconclusive"),
    v.literal("blocked"),
    v.literal("error"),
  ),
  executedAt: v.string(),
  executedBy: v.string(),
  testPlanId: v.optional(v.string()),
  hypothesisId: v.optional(v.string()),
  summary: v.optional(v.string()),
  evidenceRefs: v.optional(v.array(v.string())),
  runId: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
  findingCount: v.number(),
});

const findingValidator = v.object({
  findingId: v.string(),
  targetId: v.string(),
  title: v.string(),
  description: v.string(),
  severity: v.union(
    v.literal("info"),
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("critical"),
  ),
  status: v.union(
    v.literal("observed"),
    v.literal("confirmed"),
    v.literal("likely"),
    v.literal("skipped"),
    v.literal("unresolved"),
    v.literal("false-positive"),
  ),
  createdAt: v.string(),
  category: v.optional(
    v.union(
      v.literal("tls"),
      v.literal("headers"),
      v.literal("cms"),
      v.literal("exposure"),
      v.literal("admin-exposure"),
      v.literal("availability"),
      v.literal("known-vulnerability"),
      v.literal("configuration"),
      v.literal("logic"),
    ),
  ),
  evidence: v.optional(v.string()),
  remediationHint: v.optional(v.string()),
  affectedAssets: v.optional(v.array(v.string())),
  confidence: v.optional(
    v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  ),
  cweId: v.optional(v.string()),
  cvssScore: v.optional(v.number()),
  validationResultId: v.optional(v.string()),
  reportReady: v.optional(v.boolean()),
  runId: v.optional(v.string()),
});

const reportValidator = v.object({
  artifactId: v.string(),
  targetId: v.string(),
  variant: v.union(
    v.literal("technical"),
    v.literal("friendly"),
    v.literal("executive"),
  ),
  title: v.string(),
  generatedAt: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  findings: v.array(v.string()),
  sections: v.optional(
    v.array(
      v.object({
        title: v.string(),
        narrative: v.string(),
        bullets: v.array(v.string()),
      }),
    ),
  ),
  pdf: v.optional(
    v.object({
      storagePath: v.string(),
      fileName: v.string(),
      contentType: v.literal("application/pdf"),
      generatedAt: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
    }),
  ),
  generatedBy: v.optional(
    v.union(
      v.literal("deterministic-fallback"),
      v.literal("ai-provider"),
      v.literal("template-engine"),
    ),
  ),
  runId: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
});

const targetDetailValidator = v.object({
  target: targetProfileValidator,
  latestRun: v.union(workflowRunSummaryValidator, v.null()),
  evidence: v.array(evidenceSummaryValidator),
  hypotheses: v.array(hypothesisValidator),
  approvals: v.array(approvalValidator),
  validationResults: v.array(validationResultValidator),
  findings: v.array(findingValidator),
  reports: v.array(reportValidator),
});

// ============================================================================
// DTO Mapper
// ============================================================================

function toTargetProfileDto(doc: Doc<"targets">): TargetProfileDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    parentOrganization: doc.parentOrganization ?? undefined,
    geography: doc.geography
      ? {
          country: doc.geography.country,
          region: doc.geography.region,
          city: doc.geography.city,
        }
      : undefined,
    population: doc.population ?? undefined,
    latitude: doc.latitude ?? undefined,
    longitude: doc.longitude ?? undefined,
  };
}

function toDemoTargetCardDto(
  doc: Doc<"targets">,
  latestRun: DemoWorkflowRunSummaryDto | null,
): DemoTargetCardDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    latestRun,
  };
}

function toWorkflowRunSummaryDto(
  doc: Doc<"workflowRuns"> | undefined,
): DemoWorkflowRunSummaryDto | null {
  if (!doc) return null;
  return {
    runId: doc.runId,
    status: doc.status,
    currentPhase: doc.currentPhase ?? undefined,
  };
}

function toEvidenceSummaryDto(
  doc: Doc<"passiveScanEvidence">,
): DemoEvidenceSummaryDto {
  return {
    evidenceId: doc.evidenceId,
    source: doc.source,
    collectedAt: doc.collectedAt,
    requestedUrl: doc.requestedUrl,
    reachable: doc.reachable,
    httpStatus: doc.httpStatus ?? undefined,
    cms: doc.cms ?? undefined,
    adminExposure: doc.adminExposure ?? undefined,
    runId: doc.runId ?? undefined,
    errorCount: doc.errors?.length ?? 0,
  };
}

function toHypothesisDto(doc: Doc<"vulnerabilityHypotheses">): VulnerabilityHypothesisDto {
  return {
    hypothesisId: doc.hypothesisId,
    targetId: doc.targetId,
    title: doc.title,
    status: doc.status,
    createdAt: doc.createdAt,
    proposedBy: doc.proposedBy,
    description: doc.description ?? undefined,
    cweId: doc.cweId ?? undefined,
    cvssScore: doc.cvssScore ?? undefined,
    affectedComponents: doc.affectedComponents ?? undefined,
    prerequisites: doc.prerequisites ?? undefined,
    testPlanId: doc.testPlanId ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

function toApprovalDto(doc: Doc<"approvalGates">): ApprovalGateDto {
  return {
    gateId: doc.gateId,
    targetId: doc.targetId,
    gateType: doc.gateType,
    status: doc.status,
    requestedAt: doc.requestedAt,
    requestedBy: doc.requestedBy,
    approvedBy: doc.approvedBy ?? undefined,
    approvedAt: doc.approvedAt ?? undefined,
    rejectionReason: doc.rejectionReason ?? undefined,
    bypassJustification: doc.bypassJustification ?? undefined,
    linkedArtifactId: doc.linkedArtifactId ?? undefined,
    runId: doc.runId ?? undefined,
  };
}

function toValidationResultDto(
  doc: Doc<"validationResults">,
  findingCount: number,
): ValidationResultDto {
  return {
    resultId: doc.resultId,
    targetId: doc.targetId,
    status: doc.status,
    executedAt: doc.executedAt,
    executedBy: doc.executedBy,
    testPlanId: doc.testPlanId ?? undefined,
    hypothesisId: doc.hypothesisId ?? undefined,
    summary: doc.summary ?? undefined,
    evidenceRefs: doc.evidenceRefs ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
    findingCount,
  };
}

function toFindingDto(doc: Doc<"findings">): FindingDto {
  return {
    findingId: doc.findingId,
    targetId: doc.targetId,
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    status: doc.status,
    createdAt: doc.createdAt,
    category: doc.category ?? undefined,
    evidence: doc.evidence ?? undefined,
    remediationHint: doc.remediationHint ?? undefined,
    affectedAssets: doc.affectedAssets ?? undefined,
    confidence: doc.confidence ?? undefined,
    cweId: doc.cweId ?? undefined,
    cvssScore: doc.cvssScore ?? undefined,
    validationResultId: doc.validationResultId ?? undefined,
    reportReady: doc.reportReady ?? undefined,
    runId: doc.runId ?? undefined,
  };
}

function toReportDto(doc: Doc<"reportArtifacts">): ReportArtifactDto {
  return {
    artifactId: doc.artifactId,
    targetId: doc.targetId,
    variant: doc.variant,
    title: doc.title,
    generatedAt: doc.generatedAt,
    status: doc.status,
    findings: doc.findings,
    sections: doc.sections ?? undefined,
    pdf: doc.pdf ?? undefined,
    generatedBy: doc.generatedBy ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

async function getLatestRun(
  ctx: QueryCtx,
  targetId: string,
): Promise<DemoWorkflowRunSummaryDto | null> {
  const latestRun = await ctx.db
    .query("workflowRuns")
    .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
    .order("desc")
    .take(1);
  return toWorkflowRunSummaryDto(latestRun[0]);
}

async function listDemoTargets(
  ctx: QueryCtx,
  args: { limit?: number; riskTier?: TargetProfileDto["riskTier"] },
): Promise<DemoTargetCardDto[]> {
  const limit = normalizeListLimit(args.limit);
  const docs = args.riskTier
    ? await ctx.db
        .query("targets")
        .withIndex("by_riskTier", (q) => q.eq("riskTier", args.riskTier!))
        .take(limit)
    : await ctx.db.query("targets").take(limit);

  const cards: DemoTargetCardDto[] = [];
  for (const doc of docs) {
    cards.push(toDemoTargetCardDto(doc, await getLatestRun(ctx, doc.targetId)));
  }
  return cards;
}

async function getDemoTargetDetail(
  ctx: QueryCtx,
  targetId: string,
): Promise<DemoTargetDetailDto | null> {
  const doc = await ctx.db
    .query("targets")
    .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
    .unique();

  if (!doc) return null;

  const [latestRun, evidence, hypotheses, approvals, validationDocs, findings, reports] =
    await Promise.all([
      getLatestRun(ctx, targetId),
      ctx.db
        .query("passiveScanEvidence")
        .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
        .order("desc")
        .take(DETAIL_SECTION_LIMIT),
      ctx.db
        .query("vulnerabilityHypotheses")
        .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
        .order("desc")
        .take(DETAIL_SECTION_LIMIT),
      ctx.db
        .query("approvalGates")
        .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
        .order("desc")
        .take(DETAIL_SECTION_LIMIT),
      ctx.db
        .query("validationResults")
        .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
        .order("desc")
        .take(DETAIL_SECTION_LIMIT),
      ctx.db
        .query("findings")
        .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
        .order("desc")
        .take(DETAIL_SECTION_LIMIT),
      ctx.db
        .query("reportArtifacts")
        .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
        .order("desc")
        .take(DETAIL_SECTION_LIMIT),
    ]);

  const findingsByValidationId = new Map<string, number>();
  for (const finding of findings) {
    if (!finding.validationResultId) continue;
    findingsByValidationId.set(
      finding.validationResultId,
      (findingsByValidationId.get(finding.validationResultId) ?? 0) + 1,
    );
  }

  return {
    target: toTargetProfileDto(doc),
    latestRun,
    evidence: evidence.map(toEvidenceSummaryDto),
    hypotheses: hypotheses.map(toHypothesisDto),
    approvals: approvals.map(toApprovalDto),
    validationResults: validationDocs.map((result) =>
      toValidationResultDto(
        result,
        findingsByValidationId.get(result.resultId) ?? 0,
      ),
    ),
    findings: findings.map(toFindingDto),
    reports: reports.map(toReportDto),
  };
}

// ============================================================================
// Queries
// ============================================================================

export const listDemo = query({
  args: targetListArgsValidator,
  returns: v.array(targetCardValidator),
  handler: async (ctx, args) => {
    return await listDemoTargets(ctx, args);
  },
});

export const getDemo = query({
  args: { targetId: v.string() },
  returns: v.union(targetDetailValidator, v.null()),
  handler: async (ctx, args) => {
    return await getDemoTargetDetail(ctx, args.targetId);
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const create = internalMutation({
  args: {
    targetId: v.string(),
    name: v.string(),
    primaryUrl: v.string(),
    riskTier: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    classification: v.union(
      v.literal("public-sector"),
      v.literal("private"),
      v.literal("infrastructure"),
      v.literal("other"),
    ),
    parentOrganization: v.optional(v.string()),
    geography: v.optional(
      v.object({
        country: v.string(),
        region: v.string(),
        city: v.string(),
      }),
    ),
    population: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const existing = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (existing) {
      throw new Error(
        `Target with targetId "${args.targetId}" already exists.`,
      );
    }

    const id = await ctx.db.insert("targets", {
      targetId: args.targetId,
      name: args.name,
      primaryUrl: args.primaryUrl,
      riskTier: args.riskTier,
      classification: args.classification,
      parentOrganization: args.parentOrganization,
      geography: args.geography,
      population: args.population,
      latitude: args.latitude,
      longitude: args.longitude,
      metadata: args.metadata,
    });

    return { id, targetId: args.targetId };
  },
});

export const update = internalMutation({
  args: {
    targetId: v.string(),
    name: v.optional(v.string()),
    primaryUrl: v.optional(v.string()),
    riskTier: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
    classification: v.optional(
      v.union(
        v.literal("public-sector"),
        v.literal("private"),
        v.literal("infrastructure"),
        v.literal("other"),
      ),
    ),
    parentOrganization: v.optional(v.string()),
    geography: v.optional(
      v.object({
        country: v.string(),
        region: v.string(),
        city: v.string(),
      }),
    ),
    population: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireOperatorOrAdmin(ctx);

    const doc = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (!doc) {
      throw new Error(`Target "${args.targetId}" not found.`);
    }

    const patch: Partial<Doc<"targets">> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.primaryUrl !== undefined) patch.primaryUrl = args.primaryUrl;
    if (args.riskTier !== undefined) patch.riskTier = args.riskTier;
    if (args.classification !== undefined)
      patch.classification = args.classification;
    if (args.parentOrganization !== undefined)
      patch.parentOrganization = args.parentOrganization;
    if (args.geography !== undefined) patch.geography = args.geography;
    if (args.population !== undefined) patch.population = args.population;
    if (args.latitude !== undefined) patch.latitude = args.latitude;
    if (args.longitude !== undefined) patch.longitude = args.longitude;
    if (args.metadata !== undefined) patch.metadata = args.metadata;

    await ctx.db.patch(doc._id, patch);
    return { id: doc._id, targetId: args.targetId };
  },
});

// ============================================================================
// Helpers
// ============================================================================

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `targets.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}
