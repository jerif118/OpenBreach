import { v } from "convex/values";
import type { Infer } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const severity = v.union(
  v.literal("info"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const findingStatus = v.union(
  v.literal("observed"),
  v.literal("confirmed"),
  v.literal("likely"),
  v.literal("skipped"),
  v.literal("unresolved"),
  v.literal("false-positive"),
);

const findingCategory = v.union(
  v.literal("tls"),
  v.literal("headers"),
  v.literal("cms"),
  v.literal("exposure"),
  v.literal("admin-exposure"),
  v.literal("availability"),
  v.literal("known-vulnerability"),
  v.literal("configuration"),
  v.literal("logic"),
);

const confidence = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const workflowPhase = v.union(
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

const workflowPhaseEntry = v.object({
  phase: workflowPhase,
  enteredAt: v.string(),
  exitedAt: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),
});

const workflowRunStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("halted"),
  v.literal("rejected"),
  v.literal("failed"),
);

const validationResultStatus = v.union(
  v.literal("passed"),
  v.literal("failed"),
  v.literal("inconclusive"),
  v.literal("blocked"),
  v.literal("error"),
);

const auditEventType = v.union(
  v.literal("target-created"),
  v.literal("target-updated"),
  v.literal("target-rejected"),
  v.literal("workflow-started"),
  v.literal("workflow-pending"),
  v.literal("workflow-running"),
  v.literal("workflow-paused"),
  v.literal("workflow-completed"),
  v.literal("workflow-halted"),
  v.literal("workflow-rejected"),
  v.literal("workflow-failed"),
  v.literal("phase-changed"),
  v.literal("evidence-recorded"),
  v.literal("hypothesis-proposed"),
  v.literal("approval-requested"),
  v.literal("approval-granted"),
  v.literal("approval-rejected"),
  v.literal("approval-reset"),
  v.literal("gate-approved"),
  v.literal("gate-rejected"),
  v.literal("gate-expired"),
  v.literal("finding-created"),
  v.literal("finding-updated"),
  v.literal("validation-recorded"),
  v.literal("report-generated"),
  v.literal("report-completed"),
  v.literal("auth-granted"),
  v.literal("auth-revoked"),
  v.literal("manual-override"),
);

const auditDetails = v.record(
  v.string(),
  v.union(v.string(), v.number(), v.boolean(), v.null()),
);

const orchestratorArtifactSchema = v.object({
  municipalityExternalId: v.string(),
  targetId: v.string(),
  runId: v.string(),
  actor: v.string(),
  now: v.string(),

  authorizationScope: v.object({
    authorizationId: v.string(),
    targetId: v.string(),
    scopeType: v.union(
      v.literal("full"),
      v.literal("passive-only"),
      v.literal("limited"),
      v.literal("time-bound"),
    ),
    grantedBy: v.string(),
    grantedAt: v.string(),
    expiresAt: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
    evidenceUrl: v.optional(v.string()),
  }),

  workflowRun: v.object({
    runId: v.string(),
    targetId: v.string(),
    status: workflowRunStatus,
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    abortedAt: v.optional(v.string()),
    abortedReason: v.optional(v.string()),
    currentPhase: v.optional(workflowPhase),
    phases: v.optional(v.array(workflowPhaseEntry)),
  }),

  testPlan: v.object({
    planId: v.string(),
    targetId: v.string(),
    title: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("pending-approval"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    createdAt: v.string(),
    steps: v.array(
      v.object({
        stepId: v.string(),
        description: v.string(),
        expectedOutcome: v.optional(v.string()),
      }),
    ),
    hypothesisIds: v.optional(v.array(v.string())),
    approver: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    estimatedDurationMinutes: v.optional(v.number()),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),

  approvalGate: v.object({
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
    expiresAt: v.optional(v.string()),
  }),

  hypotheses: v.array(
    v.object({
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
    }),
  ),

  validationResult: v.object({
    resultId: v.string(),
    targetId: v.string(),
    status: validationResultStatus,
    executedAt: v.string(),
    executedBy: v.string(),
    testPlanId: v.optional(v.string()),
    hypothesisId: v.optional(v.string()),
    summary: v.optional(v.string()),
    evidenceRefs: v.optional(v.array(v.string())),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  }),

  findings: v.array(
    v.object({
      findingId: v.string(),
      targetId: v.string(),
      title: v.string(),
      description: v.string(),
      severity,
      status: findingStatus,
      createdAt: v.string(),
      category: v.optional(findingCategory),
      evidence: v.optional(v.string()),
      remediationHint: v.optional(v.string()),
      affectedAssets: v.optional(v.array(v.string())),
      confidence: v.optional(confidence),
      cweId: v.optional(v.string()),
      cvssScore: v.optional(v.number()),
      validationResultId: v.optional(v.string()),
      reportReady: v.optional(v.boolean()),
      runId: v.optional(v.string()),
    }),
  ),

  passiveEvidence: v.optional(
    v.object({
      evidenceId: v.string(),
      source: v.string(),
      collectedAt: v.string(),
      requestedUrl: v.string(),
      reachable: v.boolean(),
      finalUrl: v.optional(v.string()),
      httpStatus: v.optional(v.number()),
      headers: v.optional(v.record(v.string(), v.string())),
      runId: v.optional(v.string()),
      envelopeSource: v.string(),
      envelopeRecordedAt: v.string(),
      envelopeHash: v.string(),
      envelopeCollectedBy: v.string(),
    }),
  ),

  auditEvents: v.array(
    v.object({
      eventId: v.string(),
      targetId: v.string(),
      eventType: auditEventType,
      actor: v.string(),
      timestamp: v.string(),
      runId: v.optional(v.string()),
      details: v.optional(auditDetails),
    }),
  ),
});

// Persists an end-to-end orchestrator run (state machine + controlled
// validation probe) into the pivot tables. Internal so that the live
// HEAD probe and the multi-table write are always invoked through the
// `pnpm orchestrate:run` script, never from the browser client. Upserts
// by external ids so reruns produce stable history.
export const persistOrchestratorRun = internalMutation({
  args: { artifact: orchestratorArtifactSchema },
  handler: async (ctx, { artifact }) => {
    const summary = {
      targetUpserted: false,
      workflowRunUpserted: false,
      testPlanUpserted: false,
      approvalGateUpserted: false,
      authorizationScopeUpserted: false,
      hypothesesUpserted: 0,
      findingsUpserted: 0,
      validationResultUpserted: false,
      passiveEvidenceUpserted: false,
      auditEventsInserted: 0,
    };

    const targetExisting = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", artifact.targetId))
      .unique();

    if (!targetExisting) {
      const municipality = await ctx.db
        .query("municipalities")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", artifact.municipalityExternalId),
        )
        .unique();

      if (!municipality) {
        throw new Error(
          `Municipality ${artifact.municipalityExternalId} not found; cannot create target shell.`,
        );
      }

      await ctx.db.insert("targets", {
        targetId: artifact.targetId,
        name: municipality.name,
        primaryUrl: municipality.websiteUrl,
        riskTier: municipality.riskTier,
        classification: "public-sector",
        geography: {
          country: "Mexico",
          region: municipality.state,
          city: municipality.name,
        },
        population: municipality.population,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
        metadata: {
          municipalityExternalId: municipality.externalId,
          sourceUrl: municipality.sourceUrl,
        },
      });
      summary.targetUpserted = true;
    }

    summary.authorizationScopeUpserted = await upsertAuthorizationScope(
      ctx,
      artifact.authorizationScope,
    );

    summary.workflowRunUpserted = await upsertWorkflowRun(
      ctx,
      artifact.workflowRun,
    );

    summary.testPlanUpserted = await upsertTestPlan(ctx, artifact.testPlan);

    summary.approvalGateUpserted = await upsertApprovalGate(
      ctx,
      artifact.approvalGate,
    );

    for (const hypothesis of artifact.hypotheses) {
      const inserted = await upsertHypothesis(ctx, hypothesis);
      if (inserted) summary.hypothesesUpserted += 1;
    }

    summary.validationResultUpserted = await upsertValidationResult(
      ctx,
      artifact.validationResult,
    );

    for (const finding of artifact.findings) {
      const inserted = await upsertFinding(ctx, finding);
      if (inserted) summary.findingsUpserted += 1;
    }

    if (artifact.passiveEvidence) {
      summary.passiveEvidenceUpserted = await upsertPassiveEvidence(ctx, {
        ...artifact.passiveEvidence,
        targetId: artifact.targetId,
      });
    }

    for (const event of artifact.auditEvents) {
      const existing = await ctx.db
        .query("auditEvents")
        .withIndex("by_targetId_and_timestamp", (q) =>
          q.eq("targetId", event.targetId).eq("timestamp", event.timestamp),
        )
        .filter((q) => q.eq(q.field("eventId"), event.eventId))
        .first();

      if (!existing) {
        await ctx.db.insert("auditEvents", event);
        summary.auditEventsInserted += 1;
      }
    }

    return summary;
  },
});

type Ctx = MutationCtx;
type OrchestratorArtifact = Infer<typeof orchestratorArtifactSchema>;
type AuthorizationScopeArgs = OrchestratorArtifact["authorizationScope"];
type WorkflowRunArgs = OrchestratorArtifact["workflowRun"];
type TestPlanArgs = OrchestratorArtifact["testPlan"];
type ApprovalGateArgs = OrchestratorArtifact["approvalGate"];
type HypothesisArgs = OrchestratorArtifact["hypotheses"][number];
type ValidationResultArgs = OrchestratorArtifact["validationResult"];
type FindingArgs = OrchestratorArtifact["findings"][number];

async function upsertAuthorizationScope(
  ctx: Ctx,
  scope: AuthorizationScopeArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("authorizationScopes")
    .withIndex("by_authorizationId", (q) =>
      q.eq("authorizationId", scope.authorizationId),
    )
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, scope);
  } else {
    await ctx.db.insert("authorizationScopes", scope);
  }
  return true;
}

async function upsertWorkflowRun(
  ctx: Ctx,
  run: WorkflowRunArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("workflowRuns")
    .withIndex("by_runId", (q) => q.eq("runId", run.runId))
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, run);
  } else {
    await ctx.db.insert("workflowRuns", run);
  }
  return true;
}

async function upsertTestPlan(
  ctx: Ctx,
  plan: TestPlanArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("testPlans")
    .withIndex("by_planId", (q) => q.eq("planId", plan.planId))
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, plan);
  } else {
    await ctx.db.insert("testPlans", plan);
  }
  return true;
}

async function upsertApprovalGate(
  ctx: Ctx,
  gate: ApprovalGateArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("approvalGates")
    .withIndex("by_gateId", (q) => q.eq("gateId", gate.gateId))
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, gate);
  } else {
    await ctx.db.insert("approvalGates", gate);
  }
  return true;
}

async function upsertHypothesis(
  ctx: Ctx,
  hypothesis: HypothesisArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("vulnerabilityHypotheses")
    .withIndex("by_hypothesisId", (q) =>
      q.eq("hypothesisId", hypothesis.hypothesisId),
    )
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, hypothesis);
  } else {
    await ctx.db.insert("vulnerabilityHypotheses", hypothesis);
  }
  return true;
}

async function upsertValidationResult(
  ctx: Ctx,
  result: ValidationResultArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("validationResults")
    .withIndex("by_resultId", (q) => q.eq("resultId", result.resultId))
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, result);
  } else {
    await ctx.db.insert("validationResults", result);
  }
  return true;
}

async function upsertFinding(
  ctx: Ctx,
  finding: FindingArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("findings")
    .withIndex("by_findingId", (q) => q.eq("findingId", finding.findingId))
    .unique();

  if (existing) {
    await ctx.db.replace(existing._id, finding);
  } else {
    await ctx.db.insert("findings", finding);
  }
  return true;
}

async function upsertPassiveEvidence(
  ctx: Ctx,
  evidence: {
    evidenceId: string;
    targetId: string;
    source: string;
    collectedAt: string;
    requestedUrl: string;
    reachable: boolean;
    finalUrl?: string;
    httpStatus?: number;
    headers?: Record<string, string>;
    runId?: string;
    envelopeSource: string;
    envelopeRecordedAt: string;
    envelopeHash: string;
    envelopeCollectedBy: string;
  },
): Promise<boolean> {
  const existing = await ctx.db
    .query("passiveScanEvidence")
    .withIndex("by_evidenceId", (q) =>
      q.eq("evidenceId", evidence.evidenceId),
    )
    .unique();

  const doc = {
    ...evidence,
  };

  if (existing) {
    await ctx.db.replace(existing._id, doc);
  } else {
    await ctx.db.insert("passiveScanEvidence", doc);
  }
  return true;
}

// Public read query consumed by the dashboard pipeline adapter so each
// target row can show its latest orchestrator-driven workflow run,
// validation result, and recent audit trail joined by `targetId`.
export const orchestratorByTargetId = query({
  args: { targetId: v.string() },
  handler: async (ctx, { targetId }) => {
    const [latestRun] = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(1);

    const [latestValidation] = await ctx.db
      .query("validationResults")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(1);

    const auditEvents = await ctx.db
      .query("auditEvents")
      .withIndex("by_targetId_and_timestamp", (q) =>
        q.eq("targetId", targetId),
      )
      .order("desc")
      .take(20);

    const findings = await ctx.db
      .query("findings")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(50);

    return {
      latestRun: latestRun ? toWorkflowRunDoc(latestRun) : null,
      latestValidation: latestValidation
        ? toValidationDoc(latestValidation)
        : null,
      auditEvents: auditEvents.map(toAuditEventDoc),
      findings: findings.map(toFindingDoc),
    };
  },
});

function toWorkflowRunDoc(doc: Doc<"workflowRuns">) {
  return {
    runId: doc.runId,
    targetId: doc.targetId,
    status: doc.status,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    abortedAt: doc.abortedAt,
    abortedReason: doc.abortedReason,
    currentPhase: doc.currentPhase,
    phases: doc.phases,
  };
}

function toValidationDoc(doc: Doc<"validationResults">) {
  return {
    resultId: doc.resultId,
    targetId: doc.targetId,
    status: doc.status,
    executedAt: doc.executedAt,
    executedBy: doc.executedBy,
    testPlanId: doc.testPlanId,
    hypothesisId: doc.hypothesisId,
    summary: doc.summary,
    evidenceRefs: doc.evidenceRefs,
    runId: doc.runId,
    metadata: doc.metadata,
  };
}

function toAuditEventDoc(doc: Doc<"auditEvents">) {
  return {
    eventId: doc.eventId,
    targetId: doc.targetId,
    eventType: doc.eventType,
    actor: doc.actor,
    timestamp: doc.timestamp,
    runId: doc.runId,
    details: doc.details,
  };
}

function toFindingDoc(doc: Doc<"findings">) {
  return {
    findingId: doc.findingId,
    targetId: doc.targetId,
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    status: doc.status,
    createdAt: doc.createdAt,
    category: doc.category,
    evidence: doc.evidence,
    remediationHint: doc.remediationHint,
    affectedAssets: doc.affectedAssets,
    confidence: doc.confidence,
    cweId: doc.cweId,
    cvssScore: doc.cvssScore,
    validationResultId: doc.validationResultId,
    reportReady: doc.reportReady,
    runId: doc.runId,
  };
}
