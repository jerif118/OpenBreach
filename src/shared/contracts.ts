import { z } from "zod";

export const appRoleSchema = z.enum(["viewer", "operator", "admin"]);

export type AppRole = z.infer<typeof appRoleSchema>;

export const municipalitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  state: z.string().min(1),
  websiteUrl: z.string().url(),
  population: z.number().int().nonnegative().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  sourceUrl: z.string().url().optional(),
  riskTier: z.enum(["low", "medium", "high", "critical"]),
});

export type Municipality = z.infer<typeof municipalitySchema>;

export const scanFindingSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    "tls",
    "headers",
    "cms",
    "exposure",
    "admin-exposure",
    "availability",
    "known-vulnerability",
  ]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  title: z.string().min(1),
  description: z.string().min(1),
  evidence: z.string().min(1),
  remediationHint: z.string().min(1),
});

export type ScanFinding = z.infer<typeof scanFindingSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export type RiskLevel = z.infer<typeof riskLevelSchema>;

// ============================================================
// Generic Security-Validation Contracts
// ============================================================

// --- T-001: Base reusable helpers ---
export const nonEmptyStringSchema = z.string().min(1);
export const isoDateTimeSchema = z.string().datetime();
export const urlHttpsSchema = z.string().url().startsWith("https://");
// --- T-002: TargetProfile ---
export const targetProfileSchema = z
  .object({
    targetId: nonEmptyStringSchema.regex(/^[^\s]+$/, "no whitespace"),
    name: nonEmptyStringSchema,
    primaryUrl: urlHttpsSchema,
    riskTier: z.enum(["low", "medium", "high", "critical"]),
    classification: z.enum([
      "public-sector",
      "private",
      "infrastructure",
      "other",
    ]),
    parentOrganization: nonEmptyStringSchema.optional(),
    geography: z
      .object({
        country: nonEmptyStringSchema,
        region: nonEmptyStringSchema,
        city: nonEmptyStringSchema,
      })
      .optional(),
    population: z.number().int().nonnegative().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.classification === "public-sector" && val.population === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "population SHOULD be present for public-sector",
        path: ["population"],
      });
    }
  });
export type TargetProfile = z.infer<typeof targetProfileSchema>;

// --- T-003: AuthorizationScope ---
export const authorizationScopeSchema = z
  .object({
    authorizationId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    scopeType: z.enum(["full", "passive-only", "limited", "time-bound"]),
    grantedBy: nonEmptyStringSchema,
    grantedAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema.optional(),
    constraints: z.array(nonEmptyStringSchema).optional(),
    evidenceUrl: z.string().url().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.scopeType === "time-bound" &&
      (!val.expiresAt || new Date(val.expiresAt) <= new Date(val.grantedAt))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt must be after grantedAt for time-bound scope",
        path: ["expiresAt"],
      });
    }
  });
export type AuthorizationScope = z.infer<typeof authorizationScopeSchema>;

// --- T-004: WorkflowPhase + WorkflowRun ---
export const workflowPhaseSchema = z.object({
  phase: z.enum([
    "intake",
    "passive-scan",
    "hypothesis",
    "test-planning",
    "approval",
    "execution",
    "validation",
    "reporting",
    "archived",
  ]),
  enteredAt: isoDateTimeSchema,
  exitedAt: isoDateTimeSchema.optional(),
  rejectionReason: nonEmptyStringSchema.optional(),
});
export type WorkflowPhase = z.infer<typeof workflowPhaseSchema>;

export const workflowRunSchema = z
  .object({
    runId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    status: z.enum([
      "pending",
      "running",
      "paused",
      "completed",
      "halted",
      "rejected",
      "failed",
    ]),
    startedAt: isoDateTimeSchema,
    completedAt: isoDateTimeSchema.optional(),
    abortedAt: isoDateTimeSchema.optional(),
    abortedReason: nonEmptyStringSchema.optional(),
    currentPhase: workflowPhaseSchema.shape.phase.optional(),
    phases: z.array(workflowPhaseSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "completed" && !val.completedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completedAt required when status is completed",
        path: ["completedAt"],
      });
    }
    if (
      (val.status === "halted" || val.status === "rejected") &&
      (!val.abortedAt || !val.abortedReason)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "abortedAt and abortedReason required",
        path: ["abortedAt"],
      });
    }
    if (val.status === "rejected" && val.phases) {
      const last = val.phases[val.phases.length - 1];
      if (!last?.rejectionReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "latest phase must include rejectionReason",
          path: ["phases", val.phases.length - 1, "rejectionReason"],
        });
      }
    }
  });
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

// --- T-005: AdminExposureEntry + ScanError + PassiveScanEvidence ---
export const adminExposureEntrySchema = z.object({
  path: z.string().startsWith("/"),
  method: z.enum(["HEAD", "GET"]).optional(),
  reachable: z.boolean(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  finalUrl: z.string().url().optional(),
});
export type AdminExposureEntry = z.infer<typeof adminExposureEntrySchema>;

export const scanErrorSchema = z.object({
  stage: z.enum(["http", "tls", "cms", "admin-exposure"]),
  message: nonEmptyStringSchema,
});
export type ScanError = z.infer<typeof scanErrorSchema>;

export const passiveScanEvidenceSchema = z
  .object({
    evidenceId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum([
      "convex",
      "fixture",
      "nmap-passive",
      "ssl-labs",
      "whois",
      "dns",
    ]),
    collectedAt: isoDateTimeSchema,
    requestedUrl: z.string().url(),
    reachable: z.boolean(),
    finalUrl: z.string().url().optional(),
    httpStatus: z.number().int().min(100).max(599).optional(),
    headers: z.record(nonEmptyStringSchema, nonEmptyStringSchema).optional(),
    tls: z
      .object({
        valid: z.boolean(),
        expiresAt: isoDateTimeSchema.optional(),
        issuer: nonEmptyStringSchema.optional(),
      })
      .optional(),
    cms: z
      .object({
        name: nonEmptyStringSchema,
        version: nonEmptyStringSchema.optional(),
        confidence: z.number().min(0).max(1),
        evidence: z.array(nonEmptyStringSchema),
      })
      .optional(),
    adminExposure: z.array(adminExposureEntrySchema).optional(),
    errors: z.array(scanErrorSchema).optional(),
    runId: nonEmptyStringSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.reachable && val.httpStatus === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "httpStatus SHOULD be present when reachable is true",
        path: ["httpStatus"],
      });
    }
    if (val.tls?.expiresAt && new Date(val.tls.expiresAt) <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tls.expiresAt must be in the future",
        path: ["tls", "expiresAt"],
      });
    }
  });
export type PassiveScanEvidence = z.infer<typeof passiveScanEvidenceSchema>;

// --- T-006: TechnologyFingerprint ---
export const technologyFingerprintSchema = z
  .object({
    fingerprintId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    technology: nonEmptyStringSchema,
    category: z.enum([
      "server",
      "framework",
      "cms",
      "database",
      "library",
      "cdn",
      "analytics",
      "other",
    ]),
    confidence: z.number().min(0).max(1),
    detectedAt: isoDateTimeSchema,
    version: nonEmptyStringSchema.optional(),
    versionConfidence: z.number().min(0).max(1).optional(),
    evidence: z.array(nonEmptyStringSchema).optional(),
    cpe: nonEmptyStringSchema.optional(),
    runId: nonEmptyStringSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const hasVersion = val.version !== undefined;
    const hasVersionConfidence = val.versionConfidence !== undefined;
    if (hasVersion !== hasVersionConfidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "version and versionConfidence must both be present or both absent",
        path: ["version"],
      });
    }
  });
export type TechnologyFingerprint = z.infer<
  typeof technologyFingerprintSchema
>;

// --- T-007: VulnerabilityHypothesis ---
export const vulnerabilityHypothesisSchema = z
  .object({
    hypothesisId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    status: z.enum([
      "hypothesis",
      "approved",
      "confirmed",
      "disproven",
      "skipped",
      "rejected",
    ]),
    createdAt: isoDateTimeSchema,
    proposedBy: nonEmptyStringSchema,
    description: nonEmptyStringSchema.optional(),
    cweId: nonEmptyStringSchema.optional(),
    cvssScore: z.number().min(0).max(10).optional(),
    affectedComponents: z.array(nonEmptyStringSchema).optional(),
    prerequisites: z.array(nonEmptyStringSchema).optional(),
    testPlanId: nonEmptyStringSchema.optional(),
    runId: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.status === "rejected" &&
      (!val.metadata ||
        !(val.metadata as Record<string, unknown>).rejectionReason)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejected hypothesis must have rejectionReason in metadata",
        path: ["metadata"],
      });
    }
  });
export type VulnerabilityHypothesis = z.infer<
  typeof vulnerabilityHypothesisSchema
>;

// --- T-008: TestStep + TestPlan ---
export const testStepSchema = z.object({
  stepId: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  expectedOutcome: nonEmptyStringSchema.optional(),
});
export type TestStep = z.infer<typeof testStepSchema>;

export const testPlanSchema = z
  .object({
    planId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    status: z.enum([
      "draft",
      "pending-approval",
      "approved",
      "rejected",
      "executing",
      "completed",
      "cancelled",
    ]),
    createdAt: isoDateTimeSchema,
    steps: z.array(testStepSchema).min(1),
    hypothesisIds: z.array(nonEmptyStringSchema).optional(),
    approver: nonEmptyStringSchema.optional(),
    approvedAt: isoDateTimeSchema.optional(),
    estimatedDurationMinutes: z.number().int().positive().optional(),
    runId: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    const needsApproval = ["approved", "executing", "completed"].includes(
      val.status,
    );
    if (needsApproval && (!val.approver || !val.approvedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "approver and approvedAt required for approved/executing/completed",
        path: ["approver"],
      });
    }
    if (
      val.status === "rejected" &&
      (!val.metadata ||
        !(val.metadata as Record<string, unknown>).rejectionReason)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason required when rejected",
        path: ["metadata"],
      });
    }
  });
export type TestPlan = z.infer<typeof testPlanSchema>;

// --- T-009: ApprovalGate ---
export const approvalGateSchema = z
  .object({
    gateId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    gateType: z.enum(["intake", "test-plan", "execution", "report-release"]),
    status: z.enum(["pending", "approved", "rejected", "bypassed"]),
    requestedAt: isoDateTimeSchema,
    requestedBy: nonEmptyStringSchema,
    approvedBy: nonEmptyStringSchema.optional(),
    approvedAt: isoDateTimeSchema.optional(),
    rejectionReason: nonEmptyStringSchema.optional(),
    bypassJustification: nonEmptyStringSchema.optional(),
    linkedArtifactId: nonEmptyStringSchema.optional(),
    runId: nonEmptyStringSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "approved" && (!val.approvedBy || !val.approvedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "approvedBy and approvedAt required",
        path: ["approvedBy"],
      });
    }
    if (val.status === "rejected" && !val.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason required when rejected",
        path: ["rejectionReason"],
      });
    }
    if (
      val.status === "bypassed" &&
      (!val.bypassJustification || val.bypassJustification.length < 10)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bypassJustification must be >= 10 chars",
        path: ["bypassJustification"],
      });
    }
  });
export type ApprovalGate = z.infer<typeof approvalGateSchema>;

// --- T-010: Finding (declared before ValidationResult for z.lazy) ---
export const findingSchema = z
  .object({
    findingId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    status: z.enum([
      "observed",
      "confirmed",
      "likely",
      "skipped",
      "unresolved",
      "false-positive",
    ]),
    createdAt: isoDateTimeSchema,
    category: z
      .enum([
        "tls",
        "headers",
        "cms",
        "exposure",
        "admin-exposure",
        "availability",
        "known-vulnerability",
        "configuration",
        "logic",
      ])
      .optional(),
    evidence: nonEmptyStringSchema.optional(),
    remediationHint: nonEmptyStringSchema.optional(),
    affectedAssets: z.array(nonEmptyStringSchema).min(1).optional(),
    confidence: z.enum(["low", "medium", "high"]).optional(),
    cweId: nonEmptyStringSchema.optional(),
    cvssScore: z.number().min(0).max(10).optional(),
    validationResultId: nonEmptyStringSchema.optional(),
    reportReady: z.boolean().optional(),
    runId: nonEmptyStringSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "confirmed" && !val.validationResultId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validationResultId required when confirmed",
        path: ["validationResultId"],
      });
    }
    if (val.severity === "critical" && val.reportReady === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reportReady should default to true for critical",
        path: ["reportReady"],
      });
    }
    if (val.affectedAssets?.some((a) => a.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "affectedAssets must not contain empty strings",
        path: ["affectedAssets"],
      });
    }
  });
export type Finding = z.infer<typeof findingSchema>;

// --- T-011: ValidationResult ---
export const validationResultSchema = z
  .object({
    resultId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    status: z.enum(["passed", "failed", "inconclusive", "blocked", "error"]),
    executedAt: isoDateTimeSchema,
    executedBy: nonEmptyStringSchema,
    testPlanId: nonEmptyStringSchema.optional(),
    hypothesisId: nonEmptyStringSchema.optional(),
    findings: z.array(z.lazy(() => findingSchema)).optional(),
    summary: nonEmptyStringSchema.optional(),
    evidenceRefs: z.array(nonEmptyStringSchema).optional(),
    runId: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "failed" && (!val.findings || val.findings.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one Finding required when status is failed",
        path: ["findings"],
      });
    }
    if (
      val.status === "blocked" &&
      (!val.metadata ||
        !(val.metadata as Record<string, unknown>).blockedReason)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "blockedReason required in metadata",
        path: ["metadata"],
      });
    }
  });
export type ValidationResult = z.infer<typeof validationResultSchema>;

// --- T-012: AuditEvent (must be declared before EvidenceEnvelope) ---
export const auditEventSchema = z.object({
  eventId: nonEmptyStringSchema,
  targetId: nonEmptyStringSchema,
  eventType: z.enum([
    "target-created",
    "target-updated",
    "target-rejected",
    "workflow-started",
    "workflow-completed",
    "workflow-halted",
    "gate-approved",
    "gate-rejected",
    "evidence-recorded",
    "finding-created",
    "finding-updated",
    "report-generated",
    "auth-granted",
    "auth-revoked",
    "manual-override",
  ]),
  actor: nonEmptyStringSchema,
  timestamp: isoDateTimeSchema,
  runId: nonEmptyStringSchema.optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().optional().refine((v) => !v || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(v), { message: "invalid IP address" }),
  userAgent: nonEmptyStringSchema.optional(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

// --- T-013: ReportArtifact ---
export const reportArtifactSchema = z
  .object({
    artifactId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    variant: z.enum(["technical", "friendly", "executive"]),
    title: nonEmptyStringSchema,
    generatedAt: isoDateTimeSchema,
    status: z.enum(["pending", "generating", "completed", "failed"]),
    findings: z.array(nonEmptyStringSchema).optional(),
    sections: z.array(reportSectionSchema).optional(),
    pdf: reportPdfReferenceSchema.optional(),
    generatedBy: z.enum([
      "deterministic-fallback",
      "ai-provider",
      "template-engine",
    ]).optional(),
    runId: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.status === "completed" &&
      (!val.pdf ||
        !/^data\/reports\/[A-Za-z0-9._-]+\.pdf$/.test(val.pdf.storagePath))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "completed reports require pdf.storagePath matching data/reports/*.pdf",
        path: ["pdf", "storagePath"],
      });
    }
    if (
      val.status === "failed" &&
      (!val.metadata || !(val.metadata as Record<string, unknown>).error)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error required in metadata when failed",
        path: ["metadata"],
      });
    }
  });
export type ReportArtifact = z.infer<typeof reportArtifactSchema>;

// --- T-014: EvidenceEnvelope (discriminated union) ---
export const passiveScanPayloadSchema = passiveScanEvidenceSchema;
export const fingerprintPayloadSchema = technologyFingerprintSchema;
export const hypothesisPayloadSchema = vulnerabilityHypothesisSchema;
export const testResultPayloadSchema = validationResultSchema;
export const auditPayloadSchema = auditEventSchema;
export const otherPayloadSchema = z.record(z.string(), z.unknown());

export const evidenceEnvelopeSchema = z.discriminatedUnion("payloadType", [
  z.object({
    envelopeId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum(["agent", "system", "manual", "fixture"]),
    recordedAt: isoDateTimeSchema,
    payloadType: z.literal("passive-scan"),
    payload: passiveScanPayloadSchema,
    runId: nonEmptyStringSchema.optional(),
    hash: nonEmptyStringSchema.optional(),
    collectedBy: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    envelopeId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum(["agent", "system", "manual", "fixture"]),
    recordedAt: isoDateTimeSchema,
    payloadType: z.literal("fingerprint"),
    payload: fingerprintPayloadSchema,
    runId: nonEmptyStringSchema.optional(),
    hash: nonEmptyStringSchema.optional(),
    collectedBy: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    envelopeId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum(["agent", "system", "manual", "fixture"]),
    recordedAt: isoDateTimeSchema,
    payloadType: z.literal("hypothesis"),
    payload: hypothesisPayloadSchema,
    runId: nonEmptyStringSchema.optional(),
    hash: nonEmptyStringSchema.optional(),
    collectedBy: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    envelopeId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum(["agent", "system", "manual", "fixture"]),
    recordedAt: isoDateTimeSchema,
    payloadType: z.literal("test-result"),
    payload: testResultPayloadSchema,
    runId: nonEmptyStringSchema.optional(),
    hash: nonEmptyStringSchema.optional(),
    collectedBy: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    envelopeId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum(["agent", "system", "manual", "fixture"]),
    recordedAt: isoDateTimeSchema,
    payloadType: z.literal("audit"),
    payload: auditPayloadSchema,
    runId: nonEmptyStringSchema.optional(),
    hash: nonEmptyStringSchema.optional(),
    collectedBy: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    envelopeId: nonEmptyStringSchema,
    targetId: nonEmptyStringSchema,
    source: z.enum(["agent", "system", "manual", "fixture"]),
    recordedAt: isoDateTimeSchema,
    payloadType: z.literal("other"),
    payload: otherPayloadSchema,
    runId: nonEmptyStringSchema.optional(),
    hash: nonEmptyStringSchema.optional(),
    collectedBy: nonEmptyStringSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
]);
export type EvidenceEnvelope = z.infer<typeof evidenceEnvelopeSchema>;

// --- T-015: Backward-compat mapper ---
export function municipalityToTargetProfile(
  m: Municipality,
): TargetProfile {
  return {
    targetId: m.id,
    name: m.name,
    primaryUrl: m.websiteUrl,
    riskTier: m.riskTier,
    classification: "public-sector",
    population: m.population,
    latitude: m.latitude,
    longitude: m.longitude,
    metadata: { state: m.state, sourceUrl: m.sourceUrl },
  };
}

// ============================================================
// Target Intake Schemas
// ============================================================

export const targetListItemSchema = z.object({
  targetId: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  primaryUrl: urlHttpsSchema,
  riskTier: z.enum(["low", "medium", "high", "critical"]),
  classification: z.enum([
    "public-sector",
    "private",
    "infrastructure",
    "other",
  ]),
});

export type TargetListItem = z.infer<typeof targetListItemSchema>;

export const targetIntakeInputSchema = z.object({
  name: nonEmptyStringSchema,
  primaryUrl: urlHttpsSchema,
  classification: z.enum([
    "public-sector",
    "private",
    "infrastructure",
    "other",
  ]),
  allowedAssets: z.string().optional(),
  deniedAssets: z.string().optional(),
  validationLevel: z.enum(["passive", "semiactive", "controlled_validation"]),
  rateLimit: z.coerce.number().int().positive().default(10),
  approverName: z.string().optional(),
});

export type TargetIntakeInput = z.infer<typeof targetIntakeInputSchema>;
