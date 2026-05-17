import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

export default defineSchema({
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

  // ─────────────────────────────────────────────────────────────────
  // OpenBreach — Workflow Run Persistence (Issue 65)
  // ─────────────────────────────────────────────────────────────────

  targets: defineTable({
    targetId: v.string(),
    assetId: v.string(),
    organizationName: v.string(),
    canonicalUrl: v.string(),
    outOfScope: v.optional(v.boolean()),
  })
    .index("by_targetId", ["targetId"])
    .index("by_organizationName", ["organizationName"])
    .index("by_outOfScope", ["outOfScope"]),

  authorizationScopes: defineTable({
    scopeId: v.string(),
    targetId: v.string(),
    authorizedUrls: v.array(v.string()),
    authorizedMethods: v.array(v.union(v.literal("GET"), v.literal("HEAD"), v.literal("OPTIONS"))),
    authorizedCategories: v.array(v.string()),
    maxDepth: v.optional(v.number()),
    validFrom: v.string(),
    validUntil: v.string(),
    agentId: v.string(),
    legalBasis: v.optional(v.string()),
  })
    .index("by_scopeId", ["scopeId"])
    .index("by_targetId", ["targetId"]),

  workflowRuns: defineTable({
    runId: v.string(),
    scopeId: v.string(),
    targetId: v.string(),
    status: v.union(
      v.literal("hypothesis"),
      v.literal("approved"),
      v.literal("confirmed"),
      v.literal("skipped"),
      v.literal("halted"),
      v.literal("rejected"),
    ),
    hypothesisId: v.optional(v.string()),
    testPlanId: v.optional(v.string()),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    agentId: v.string(),
    evidenceEnvelopeId: v.optional(v.string()),
  })
    .index("by_runId", ["runId"])
    .index("by_targetId", ["targetId"])
    .index("by_targetId_and_status", ["targetId", "status"]),

  passiveScanEvidence: defineTable({
    evidenceId: v.string(),
    runId: v.string(),
    targetId: v.string(),
    collectedAt: v.string(),
    sourceAgent: v.string(),
    observationType: v.union(
      v.literal("response-header"),
      v.literal("resource-load"),
      v.literal("tls-version"),
      v.literal("content-match"),
    ),
    rawData: v.record(v.string(), v.string()),
    canonicalUrl: v.string(),
    evidenceRefs: v.optional(v.array(v.string())),
  })
    .index("by_evidenceId", ["evidenceId"])
    .index("by_targetId_and_runId", ["targetId", "runId"]),

  vulnerabilityHypotheses: defineTable({
    hypothesisId: v.string(),
    targetId: v.string(),
    runId: v.string(),
    category: v.union(
      v.literal("tls"),
      v.literal("headers"),
      v.literal("cms"),
      v.literal("exposure"),
      v.literal("availability"),
      v.literal("known-vulnerability"),
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    title: v.string(),
    description: v.string(),
    evidenceIds: v.array(v.string()),
    confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.string(),
    sourceAgent: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  })
    .index("by_hypothesisId", ["hypothesisId"])
    .index("by_targetId_and_runId", ["targetId", "runId"]),

  approvalGates: defineTable({
    gateId: v.string(),
    hypothesisId: v.string(),
    scopeId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    requestedAt: v.string(),
    reviewedAt: v.optional(v.string()),
    reviewerId: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    sourceAgent: v.string(),
  })
    .index("by_gateId", ["gateId"])
    .index("by_hypothesisId", ["hypothesisId"]),

  validationResults: defineTable({
    resultId: v.string(),
    hypothesisId: v.string(),
    gateId: v.string(),
    runId: v.string(),
    targetId: v.string(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("skipped"),
      v.literal("halted"),
      v.literal("rejected"),
    ),
    executedAt: v.string(),
    completedAt: v.optional(v.string()),
    evidenceIds: v.array(v.string()),
    findings: v.optional(v.array(v.string())),
    agentId: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_resultId", ["resultId"])
    .index("by_targetId_and_runId", ["targetId", "runId"]),

  findings: defineTable({
    findingId: v.string(),
    resultId: v.string(),
    hypothesisId: v.string(),
    targetId: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    category: v.union(
      v.literal("tls"),
      v.literal("headers"),
      v.literal("cms"),
      v.literal("exposure"),
      v.literal("availability"),
      v.literal("known-vulnerability"),
    ),
    title: v.string(),
    description: v.string(),
    evidenceIds: v.array(v.string()),
    cveId: v.optional(v.string()),
    cweId: v.optional(v.string()),
    createdAt: v.string(),
    sourceAgent: v.string(),
    confirmedBy: v.string(),
  })
    .index("by_findingId", ["findingId"])
    .index("by_targetId", ["targetId"]),

  auditEvents: defineTable({
    eventId: v.string(),
    timestamp: v.string(),
    eventType: v.union(
      v.literal("scope_created"),
      v.literal("workflow_started"),
      v.literal("workflow_completed"),
      v.literal("hypothesis_created"),
      v.literal("gate_requested"),
      v.literal("gate_approved"),
      v.literal("gate_rejected"),
      v.literal("validation_executed"),
      v.literal("finding_confirmed"),
      v.literal("report_generated"),
    ),
    agentId: v.string(),
    targetId: v.optional(v.string()),
    runId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
  })
    .index("by_eventId", ["eventId"])
    .index("by_targetId_and_timestamp", ["targetId", "timestamp"]),
});
