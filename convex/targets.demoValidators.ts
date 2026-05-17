import { v } from "convex/values";
import {
  classificationValidator,
  geographyValidator,
  riskTierValidator,
} from "./targets.validators";

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

export const targetCardValidator = v.object({
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
  confidence: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  cweId: v.optional(v.string()),
  cvssScore: v.optional(v.number()),
  validationResultId: v.optional(v.string()),
  reportReady: v.optional(v.boolean()),
  runId: v.optional(v.string()),
});

const reportValidator = v.object({
  artifactId: v.string(),
  targetId: v.string(),
  variant: v.union(v.literal("technical"), v.literal("friendly"), v.literal("executive")),
  title: v.string(),
  generatedAt: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  findings: v.array(v.string()),
  sections: v.optional(v.array(v.object({ title: v.string(), narrative: v.string(), bullets: v.array(v.string()) }))),
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
    v.union(v.literal("deterministic-fallback"), v.literal("ai-provider"), v.literal("template-engine")),
  ),
  runId: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
});

export const targetDetailValidator = v.object({
  target: targetProfileValidator,
  latestRun: v.union(workflowRunSummaryValidator, v.null()),
  evidence: v.array(evidenceSummaryValidator),
  hypotheses: v.array(hypothesisValidator),
  approvals: v.array(approvalValidator),
  validationResults: v.array(validationResultValidator),
  findings: v.array(findingValidator),
  reports: v.array(reportValidator),
});
