import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// Existing helpers (municipality domain)
// ============================================================================

const severity = v.union(
  v.literal("info"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

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

const riskLevel = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const reportStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
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

// ============================================================================
// New helpers (security-validation pivot domain)
// ============================================================================

const geography = v.object({
  country: v.string(),
  region: v.string(),
  city: v.string(),
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

const authorizationScopeType = v.union(
  v.literal("full"),
  v.literal("passive-only"),
  v.literal("limited"),
  v.literal("time-bound"),
);

const vulnerabilityHypothesisStatus = v.union(
  v.literal("hypothesis"),
  v.literal("approved"),
  v.literal("confirmed"),
  v.literal("disproven"),
  v.literal("skipped"),
  v.literal("rejected"),
);

const testPlanStatus = v.union(
  v.literal("draft"),
  v.literal("pending-approval"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("executing"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const testStep = v.object({
  stepId: v.string(),
  description: v.string(),
  expectedOutcome: v.optional(v.string()),
});

const approvalGateType = v.union(
  v.literal("intake"),
  v.literal("test-plan"),
  v.literal("execution"),
  v.literal("report-release"),
);

const approvalGateStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("bypassed"),
);

const validationResultStatus = v.union(
  v.literal("passed"),
  v.literal("failed"),
  v.literal("inconclusive"),
  v.literal("blocked"),
  v.literal("error"),
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

const reportArtifactVariant = v.union(
  v.literal("technical"),
  v.literal("friendly"),
  v.literal("executive"),
);

const reportArtifactStatus = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
);

const reportSection = v.object({
  title: v.string(),
  narrative: v.string(),
  bullets: v.array(v.string()),
});

const evidenceTls = v.object({
  valid: v.boolean(),
  expiresAt: v.optional(v.string()),
  issuer: v.optional(v.string()),
});

const evidenceCms = v.object({
  name: v.string(),
  version: v.optional(v.string()),
  confidence: v.number(),
  evidence: v.array(v.string()),
});

const evidenceAdminExposure = v.object({
  path: v.string(),
  method: v.optional(v.union(v.literal("HEAD"), v.literal("GET"))),
  reachable: v.boolean(),
  httpStatus: v.optional(v.number()),
  finalUrl: v.optional(v.string()),
});

const evidenceError = v.object({
  stage: v.union(
    v.literal("http"),
    v.literal("tls"),
    v.literal("cms"),
    v.literal("admin-exposure"),
  ),
  message: v.string(),
});

// ============================================================================
// Schema
// ============================================================================

export default defineSchema({
  // -------------------------------------------------------------------------
  // Existing municipality tables (DO NOT MODIFY)
  // -------------------------------------------------------------------------
  municipalities: defineTable({
    externalId: v.string(),
    name: v.string(),
    state: v.string(),
    websiteUrl: v.string(),
    population: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    riskTier: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
  })
    .index("by_externalId", ["externalId"])
    .index("by_state", ["state"]),

  scanResults: defineTable({
    externalId: v.string(),
    municipalityId: v.id("municipalities"),
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
    riskScore: v.optional(v.number()),
    riskLevel: v.optional(riskLevel),
    findings: v.array(finding),
    score: v.optional(v.number()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_municipalityId", ["municipalityId"])
    .index("by_municipalityId_and_scannedAt", ["municipalityId", "scannedAt"])
    .index("by_riskLevel", ["riskLevel"]),

  rawScanResults: defineTable({
    externalId: v.string(),
    municipalityId: v.id("municipalities"),
    source: v.union(v.literal("convex"), v.literal("fixture")),
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
  })
    .index("by_externalId", ["externalId"])
    .index("by_municipalityId", ["municipalityId"])
    .index("by_scannedAt", ["scannedAt"]),

  remediationReports: defineTable({
    externalId: v.string(),
    municipalityId: v.id("municipalities"),
    scanResultId: v.optional(v.id("scanResults")),
    status: reportStatus,
    generatedAt: v.string(),
    updatedAt: v.string(),
    summary: v.optional(v.string()),
    priorityActions: v.optional(v.array(v.string())),
    findings: v.optional(v.array(reportFinding)),
    generatedBy: v.optional(
      v.union(v.literal("deterministic-fallback"), v.literal("ai-provider")),
    ),
    pdf: v.optional(reportPdfReference),
    artifacts: v.optional(reportArtifacts),
    error: v.optional(v.string()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_municipalityId", ["municipalityId"])
    .index("by_municipalityId_and_generatedAt", [
      "municipalityId",
      "generatedAt",
    ]),

  userProfiles: defineTable({
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    roles: v.array(
      v.union(v.literal("viewer"), v.literal("operator"), v.literal("admin")),
    ),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  // -------------------------------------------------------------------------
  // New security-validation pivot tables (Issue #65)
  // -------------------------------------------------------------------------

  targets: defineTable({
    targetId: v.string(),
    name: v.string(),
    primaryUrl: v.string(),
    riskTier: riskLevel,
    classification: v.union(
      v.literal("public-sector"),
      v.literal("private"),
      v.literal("infrastructure"),
      v.literal("other"),
    ),
    parentOrganization: v.optional(v.string()),
    geography: v.optional(geography),
    population: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
  })
    .index("by_targetId", ["targetId"])
    .index("by_riskTier", ["riskTier"]),

  authorizationScopes: defineTable({
    authorizationId: v.string(),
    targetId: v.string(),
    scopeType: authorizationScopeType,
    grantedBy: v.string(),
    grantedAt: v.string(),
    expiresAt: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
    evidenceUrl: v.optional(v.string()),
  })
    .index("by_targetId", ["targetId"])
    .index("by_authorizationId", ["authorizationId"]),

  workflowRuns: defineTable({
    runId: v.string(),
    targetId: v.string(),
    status: workflowRunStatus,
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    abortedAt: v.optional(v.string()),
    abortedReason: v.optional(v.string()),
    currentPhase: v.optional(workflowPhase),
    phases: v.optional(v.array(workflowPhaseEntry)),
  })
    .index("by_targetId", ["targetId"])
    .index("by_runId", ["runId"])
    .index("by_targetId_and_status", ["targetId", "status"]),

  passiveScanEvidence: defineTable({
    evidenceId: v.string(),
    targetId: v.string(),
    source: v.string(),
    collectedAt: v.string(),
    requestedUrl: v.string(),
    reachable: v.boolean(),
    finalUrl: v.optional(v.string()),
    httpStatus: v.optional(v.number()),
    headers: v.optional(v.record(v.string(), v.string())),
    tls: v.optional(evidenceTls),
    cms: v.optional(evidenceCms),
    adminExposure: v.optional(v.array(evidenceAdminExposure)),
    errors: v.optional(v.array(evidenceError)),
    runId: v.optional(v.string()),
    envelopeSource: v.string(),
    envelopeRecordedAt: v.string(),
    envelopeHash: v.string(),
    envelopeCollectedBy: v.string(),
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_runId", ["targetId", "runId"])
    .index("by_evidenceId", ["evidenceId"]),

  technologyFingerprints: defineTable({
    fingerprintId: v.string(),
    targetId: v.string(),
    technology: v.string(),
    category: v.union(
      v.literal("server"),
      v.literal("framework"),
      v.literal("cms"),
      v.literal("database"),
      v.literal("library"),
      v.literal("cdn"),
      v.literal("analytics"),
      v.literal("other"),
    ),
    confidence: v.number(),
    detectedAt: v.string(),
    version: v.optional(v.string()),
    versionConfidence: v.optional(v.number()),
    evidence: v.optional(v.array(v.string())),
    cpe: v.optional(v.string()),
    runId: v.optional(v.string()),
    envelopeSource: v.string(),
    envelopeRecordedAt: v.string(),
    envelopeHash: v.string(),
    envelopeCollectedBy: v.string(),
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_runId", ["targetId", "runId"])
    .index("by_fingerprintId", ["fingerprintId"]),

  vulnerabilityHypotheses: defineTable({
    hypothesisId: v.string(),
    targetId: v.string(),
    title: v.string(),
    status: vulnerabilityHypothesisStatus,
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
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_runId", ["targetId", "runId"])
    .index("by_targetId_and_status", ["targetId", "status"])
    .index("by_hypothesisId", ["hypothesisId"]),

  testPlans: defineTable({
    planId: v.string(),
    targetId: v.string(),
    title: v.string(),
    status: testPlanStatus,
    createdAt: v.string(),
    steps: v.array(testStep),
    hypothesisIds: v.optional(v.array(v.string())),
    approver: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    estimatedDurationMinutes: v.optional(v.number()),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_status", ["targetId", "status"])
    .index("by_planId", ["planId"]),

  approvalGates: defineTable({
    gateId: v.string(),
    targetId: v.string(),
    gateType: approvalGateType,
    status: approvalGateStatus,
    requestedAt: v.string(),
    requestedBy: v.string(),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    bypassJustification: v.optional(v.string()),
    linkedArtifactId: v.optional(v.string()),
    runId: v.optional(v.string()),
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_status", ["targetId", "status"])
    .index("by_gateId", ["gateId"]),

  validationResults: defineTable({
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
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_runId", ["targetId", "runId"])
    .index("by_resultId", ["resultId"]),

  findings: defineTable({
    findingId: v.string(),
    targetId: v.string(),
    title: v.string(),
    description: v.string(),
    severity: severity,
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
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_runId", ["targetId", "runId"])
    .index("by_targetId_and_severity", ["targetId", "severity"])
    .index("by_validationResultId", ["validationResultId"])
    .index("by_findingId", ["findingId"]),

  auditEvents: defineTable({
    eventId: v.string(),
    targetId: v.string(),
    eventType: auditEventType,
    actor: v.string(),
    timestamp: v.string(),
    runId: v.optional(v.string()),
    details: v.optional(auditDetails),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_timestamp", ["targetId", "timestamp"]),

  reportArtifacts: defineTable({
    artifactId: v.string(),
    targetId: v.string(),
    variant: reportArtifactVariant,
    title: v.string(),
    generatedAt: v.string(),
    status: reportArtifactStatus,
    findings: v.array(v.string()),
    sections: v.optional(v.array(reportSection)),
    pdf: v.optional(reportPdfReference),
    generatedBy: v.optional(
      v.union(
        v.literal("deterministic-fallback"),
        v.literal("ai-provider"),
        v.literal("template-engine"),
      ),
    ),
    runId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  })
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_variant", ["targetId", "variant"])
    .index("by_targetId_and_status", ["targetId", "status"])
    .index("by_artifactId", ["artifactId"]),
});
