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

const pivotIdSchema = z.string().min(1);
const pivotTimestampSchema = z.string().datetime();
const pivotUrlSchema = z.string().url();
const pivotTagsSchema = z.array(z.string().min(1)).default([]);

const pivotSourceSchema = z
  .object({
    type: z.enum(["agent", "operator", "system", "fixture"]),
    name: z.string().min(1),
    version: z.string().min(1).optional(),
  })
  .strict();

const evidenceReferenceSchema = z
  .object({
    evidenceId: pivotIdSchema,
    description: z.string().min(1).optional(),
  })
  .strict();

const evidenceReferencesSchema = z.array(evidenceReferenceSchema).min(1);

const pivotStatusSchema = z.enum([
  "hypothesis",
  "approved",
  "confirmed",
  "skipped",
  "halted",
  "rejected",
]);

const confidenceSchema = z.enum(["low", "medium", "high"]);

export const targetProfileSchema = z
  .object({
    targetId: pivotIdSchema,
    organizationName: z.string().min(1),
    canonicalUrl: pivotUrlSchema,
    assetIds: z.array(pivotIdSchema).min(1),
    status: z.enum(["approved", "rejected"]),
    summary: z.string().min(1).optional(),
    tags: pivotTagsSchema,
  })
  .strict();

export type TargetProfile = z.infer<typeof targetProfileSchema>;

export const authorizationScopeSchema = z
  .object({
    scopeId: pivotIdSchema,
    targetId: pivotIdSchema,
    status: z.enum(["approved", "rejected", "halted"]),
    authorizedBy: z.string().min(1),
    authorizedAt: pivotTimestampSchema,
    startsAt: pivotTimestampSchema,
    endsAt: pivotTimestampSchema.optional(),
    allowedAssetIds: z.array(pivotIdSchema).min(1),
    constraints: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type AuthorizationScope = z.infer<typeof authorizationScopeSchema>;

export const workflowRunSchema = z
  .object({
    workflowRunId: pivotIdSchema,
    targetId: pivotIdSchema,
    scopeId: pivotIdSchema,
    status: z.enum([
      "planned",
      "running",
      "hypothesis",
      "approved",
      "confirmed",
      "skipped",
      "halted",
      "rejected",
    ]),
    startedAt: pivotTimestampSchema,
    completedAt: pivotTimestampSchema.optional(),
    source: pivotSourceSchema,
    summary: z.string().min(1).optional(),
  })
  .strict();

export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export const passiveScanEvidenceSchema = z
  .object({
    evidenceId: pivotIdSchema,
    targetId: pivotIdSchema,
    assetId: pivotIdSchema,
    observedAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    canonicalUrl: pivotUrlSchema,
    observation: z.string().min(1),
    evidenceReferences: z.array(evidenceReferenceSchema).default([]),
  })
  .strict();

export type PassiveScanEvidence = z.infer<typeof passiveScanEvidenceSchema>;

export const technologyFingerprintSchema = z
  .object({
    fingerprintId: pivotIdSchema,
    targetId: pivotIdSchema,
    assetId: pivotIdSchema,
    observedAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    technology: z.string().min(1),
    category: z.enum([
      "framework",
      "cms",
      "server",
      "library",
      "service",
      "unknown",
    ]),
    confidence: confidenceSchema,
    evidenceReferences: evidenceReferencesSchema,
  })
  .strict();

export type TechnologyFingerprint = z.infer<typeof technologyFingerprintSchema>;

export const vulnerabilityHypothesisSchema = z
  .object({
    hypothesisId: pivotIdSchema,
    targetId: pivotIdSchema,
    assetId: pivotIdSchema.optional(),
    createdAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    severity: riskLevelSchema,
    status: z.enum(["hypothesis", "approved", "confirmed", "rejected"]),
    confidence: confidenceSchema,
    evidenceReferences: evidenceReferencesSchema,
  })
  .strict();

export type VulnerabilityHypothesis = z.infer<
  typeof vulnerabilityHypothesisSchema
>;

export const testPlanSchema = z
  .object({
    testPlanId: pivotIdSchema,
    targetId: pivotIdSchema,
    scopeId: pivotIdSchema,
    hypothesisIds: z.array(pivotIdSchema).min(1),
    status: z.enum(["draft", "approved", "rejected", "halted"]),
    createdAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    summary: z.string().min(1),
    validationSteps: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type TestPlan = z.infer<typeof testPlanSchema>;

export const approvalGateSchema = z
  .object({
    approvalGateId: pivotIdSchema,
    targetId: pivotIdSchema,
    testPlanId: pivotIdSchema,
    status: z.enum(["approved", "rejected", "halted"]),
    decidedAt: pivotTimestampSchema,
    decidedBy: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export type ApprovalGate = z.infer<typeof approvalGateSchema>;

export const validationResultSchema = z
  .object({
    validationResultId: pivotIdSchema,
    targetId: pivotIdSchema,
    testPlanId: pivotIdSchema,
    status: z.enum(["confirmed", "skipped", "halted", "rejected"]),
    validatedAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    summary: z.string().min(1),
    evidenceReferences: evidenceReferencesSchema,
  })
  .strict();

export type ValidationResult = z.infer<typeof validationResultSchema>;

export const evidenceEnvelopeSchema = z
  .object({
    envelopeId: pivotIdSchema,
    targetId: pivotIdSchema,
    createdAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    summary: z.string().min(1),
    evidenceReferences: evidenceReferencesSchema,
  })
  .strict();

export type EvidenceEnvelope = z.infer<typeof evidenceEnvelopeSchema>;

export const findingSchema = z
  .object({
    findingId: pivotIdSchema,
    targetId: pivotIdSchema,
    assetIds: z.array(pivotIdSchema).min(1),
    createdAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    severity: riskLevelSchema,
    status: pivotStatusSchema,
    evidenceReferences: evidenceReferencesSchema,
    remediationGuidance: z.string().min(1).optional(),
  })
  .strict();

export type Finding = z.infer<typeof findingSchema>;

export const reportArtifactSchema = z
  .object({
    reportId: pivotIdSchema,
    targetId: pivotIdSchema,
    generatedAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    status: z.enum(["draft", "approved", "rejected"]),
    audience: z.enum(["technical", "friendly"]),
    title: z.string().min(1),
    summary: z.string().min(1),
    findingIds: z.array(pivotIdSchema).default([]),
    evidenceReferences: evidenceReferencesSchema,
  })
  .strict();

export type ReportArtifact = z.infer<typeof reportArtifactSchema>;

export const auditEventSchema = z
  .object({
    auditEventId: pivotIdSchema,
    targetId: pivotIdSchema,
    occurredAt: pivotTimestampSchema,
    source: pivotSourceSchema,
    actor: z.string().min(1),
    action: z.enum([
      "target_created",
      "scope_approved",
      "workflow_started",
      "approval_decided",
      "validation_recorded",
      "finding_recorded",
      "report_generated",
      "workflow_halted",
    ]),
    status: z.enum(["approved", "rejected", "confirmed", "skipped", "halted"]),
    summary: z.string().min(1),
    evidenceReferences: evidenceReferencesSchema,
  })
  .strict();

export type AuditEvent = z.infer<typeof auditEventSchema>;

export const municipalityListItemSchema = municipalitySchema.extend({
  riskScore: z.number().min(0).max(100),
  riskLevel: riskLevelSchema,
});

export type MunicipalityListItem = z.infer<typeof municipalityListItemSchema>;

export const scanResultSchema = z.object({
  id: z.string().min(1),
  municipalityId: z.string().min(1),
  scannedAt: z.string().datetime(),
  requestedUrl: z.string().url().optional(),
  finalUrl: z.string().url().optional(),
  reachable: z.boolean().optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string().min(1), z.string().min(1)).optional(),
  tls: z
    .object({
      valid: z.boolean(),
      expiresAt: z.string().datetime().optional(),
      issuer: z.string().min(1).optional(),
    })
    .optional(),
  cms: z
    .object({
      name: z.enum(["wordpress", "joomla", "drupal", "unknown"]),
      version: z.string().min(1).optional(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string().min(1)),
    })
    .optional(),
  adminExposure: z
    .array(
      z.object({
        path: z.string().startsWith("/"),
        method: z.enum(["HEAD", "GET"]).optional(),
        reachable: z.boolean(),
        httpStatus: z.number().int().min(100).max(599).optional(),
        finalUrl: z.string().url().optional(),
      }),
    )
    .optional(),
  errors: z
    .array(
      z.object({
        stage: z.enum(["http", "tls", "cms", "admin-exposure"]),
        message: z.string().min(1),
      }),
    )
    .optional(),
  riskScore: z.number().min(0).max(100),
  riskLevel: riskLevelSchema,
  findings: z.array(scanFindingSchema),
  score: z.number().min(0).max(100).optional(),
});

export type ScanResult = z.infer<typeof scanResultSchema>;

export const rawScanEvidenceSchema = z.object({
  municipalityId: z.string().min(1),
  source: z.enum(["convex", "fixture"]),
  requestedUrl: z.string().url(),
  scannedAt: z.string().datetime(),
  reachable: z.boolean(),
  finalUrl: z.string().url().optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string().min(1), z.string().min(1)).default({}),
  tls: z
    .object({
      valid: z.boolean(),
      expiresAt: z.string().datetime().optional(),
      issuer: z.string().min(1).optional(),
    })
    .optional(),
  cms: z
    .object({
      name: z.enum(["wordpress", "joomla", "drupal", "unknown"]),
      version: z.string().min(1).optional(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string().min(1)),
    })
    .optional(),
  adminExposure: z.array(
    z.object({
      path: z.string().startsWith("/"),
      method: z.enum(["HEAD", "GET"]).optional(),
      reachable: z.boolean(),
      httpStatus: z.number().int().min(100).max(599).optional(),
      finalUrl: z.string().url().optional(),
    }),
  ),
  errors: z.array(
    z.object({
      stage: z.enum(["http", "tls", "cms", "admin-exposure"]),
      message: z.string().min(1),
    }),
  ),
});

export type RawScanEvidence = z.infer<typeof rawScanEvidenceSchema>;

export const rawScanPersistenceResultSchema = rawScanEvidenceSchema
  .omit({ municipalityId: true })
  .extend({ municipalityExternalId: z.string().min(1) });

export type RawScanPersistenceResult = z.infer<
  typeof rawScanPersistenceResultSchema
>;

export const rawScanPersistenceArgsSchema = z.object({
  results: z.array(rawScanPersistenceResultSchema),
});

export type RawScanPersistenceArgs = z.infer<
  typeof rawScanPersistenceArgsSchema
>;

export const enrichedScanPersistenceResultSchema = scanResultSchema
  .omit({ municipalityId: true })
  .extend({ municipalityExternalId: z.string().min(1) });

export type EnrichedScanPersistenceResult = z.infer<
  typeof enrichedScanPersistenceResultSchema
>;

export const enrichedScanPersistenceArgsSchema = z.object({
  results: z.array(enrichedScanPersistenceResultSchema),
});

export type EnrichedScanPersistenceArgs = z.infer<
  typeof enrichedScanPersistenceArgsSchema
>;

const finiteNumberSchema = z.number().finite();

export const scanConvexEnvironmentSchema = z.object({
  fromFixture: z.boolean(),
  fixturePath: z.string().min(1),
  municipalityIds: z.array(z.string().min(1)),
  concurrency: finiteNumberSchema.int().min(1),
  controls: z.object({
    timeoutMs: finiteNumberSchema.nonnegative(),
    retries: finiteNumberSchema.int().nonnegative(),
    delayMs: finiteNumberSchema.nonnegative(),
  }),
});

export type ScanConvexEnvironment = z.infer<typeof scanConvexEnvironmentSchema>;

export const reportFindingSchema = scanFindingSchema
  .extend({
    confidence: z.enum(["low", "medium", "high"]).default("medium"),
    status: z
      .enum(["confirmed", "likely", "observed", "skipped", "unresolved"])
      .default("observed"),
    affectedAssets: z.array(z.string().min(1)).default([]),
    evidenceSummary: z.string().min(1),
    remediationSteps: z.array(z.string().min(1)).default([]),
    verificationSteps: z.array(z.string().min(1)).default([]),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const reportPersistenceFindingSchema = reportFindingSchema
  .omit({ raw: true })
  .strip();

export const reportSectionSchema = z.object({
  title: z.string().min(1),
  narrative: z.string().min(1),
  bullets: z.array(z.string().min(1)).default([]),
});

export const remediationReportSchema = z.object({
  id: z.string().min(1),
  municipalityId: z.string().min(1),
  variant: z.enum(["technical", "friendly"]),
  generatedAt: z.string().datetime(),
  title: z.string().min(1),
  summary: z.string().min(1),
  priorityActions: z.array(z.string().min(1)),
  findings: z.array(reportFindingSchema),
  sections: z.object({
    scope: reportSectionSchema,
    authorization: reportSectionSchema,
    methodology: reportSectionSchema,
    findingsOverview: reportSectionSchema,
    skippedTests: reportSectionSchema,
    validationStatus: reportSectionSchema,
    limitations: reportSectionSchema,
    remediationChecklist: reportSectionSchema,
    verificationGuidance: reportSectionSchema,
  }),
  generatedBy: z.enum(["deterministic-fallback", "ai-provider"]),
});

export type RemediationReport = z.infer<typeof remediationReportSchema>;
export type ReportFinding = RemediationReport["findings"][number];
export type ReportAudience = RemediationReport["variant"];

export const remediationReportVariantsSchema = z.object({
  technical: remediationReportSchema,
  friendly: remediationReportSchema,
});

export type RemediationReportVariants = z.infer<
  typeof remediationReportVariantsSchema
>;

export const reportGenerationStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
]);

export type ReportGenerationStatus = z.infer<
  typeof reportGenerationStatusSchema
>;

export const reportPdfReferenceSchema = z.object({
  storagePath: z
    .string()
    .min(1)
    .regex(
      /^data\/reports\/[A-Za-z0-9._-]+\.pdf$/,
      "PDF path must stay within data/reports/",
    ),
  fileName: z
    .string()
    .min(1)
    .regex(
      /^[A-Za-z0-9._-]+\.pdf$/,
      "PDF file name must be a safe .pdf file name",
    ),
  contentType: z.literal("application/pdf").default("application/pdf"),
  generatedAt: z.string().datetime().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export type ReportPdfReference = z.infer<typeof reportPdfReferenceSchema>;

export const reportArtifactReferenceSchema = z.object({
  variant: z.enum(["technical", "friendly"]),
  label: z.string().min(1),
  pdf: reportPdfReferenceSchema,
});

export const reportArtifactsSchema = z.object({
  technical: reportArtifactReferenceSchema.optional(),
  friendly: reportArtifactReferenceSchema.optional(),
});

export type ReportArtifactReference = z.infer<
  typeof reportArtifactReferenceSchema
>;
export type ReportArtifacts = z.infer<typeof reportArtifactsSchema>;

export const reportPersistenceArgsSchema = z.object({
  externalId: z.string().min(1),
  municipalityExternalId: z.string().min(1),
  scanResultExternalId: z.string().min(1).optional(),
  status: z.literal("completed"),
  generatedAt: z.string().datetime(),
  summary: z.string().min(1),
  priorityActions: z.array(z.string().min(1)),
  findings: z.array(reportPersistenceFindingSchema),
  generatedBy: z.enum(["deterministic-fallback", "ai-provider"]),
  pdf: reportPdfReferenceSchema,
  artifacts: reportArtifactsSchema,
});

export type ReportPersistenceArgs = z.infer<typeof reportPersistenceArgsSchema>;

export const reportPersistencePayloadSchema = z.object({
  results: z.array(reportPersistenceArgsSchema),
});

export type ReportPersistencePayload = z.infer<
  typeof reportPersistencePayloadSchema
>;

const reportMetadataBaseSchema = z.object({
  reportId: z.string().min(1),
  municipalityId: z.string().min(1),
  generatedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  pdf: reportPdfReferenceSchema.optional(),
  artifacts: reportArtifactsSchema.optional(),
});

const completedReportMetadataSchema = reportMetadataBaseSchema.extend({
  status: z.literal("completed"),
});

const pendingReportMetadataSchema = reportMetadataBaseSchema.extend({
  status: z.literal("pending"),
});

const failedReportMetadataSchema = reportMetadataBaseSchema.extend({
  status: z.literal("failed"),
  error: z.string().min(1),
});

export const reportMetadataSchema = z.discriminatedUnion("status", [
  pendingReportMetadataSchema,
  completedReportMetadataSchema,
  failedReportMetadataSchema,
]);

export type ReportMetadata = z.infer<typeof reportMetadataSchema>;

export const municipalityDetailSchema = z.object({
  municipality: municipalitySchema,
  scan: scanResultSchema.nullable(),
  report: reportMetadataSchema.nullable(),
});

export type MunicipalityDetail = z.infer<typeof municipalityDetailSchema>;

export const selectedMunicipalityReportContextSchema = z.object({
  municipality: municipalitySchema,
  scan: scanResultSchema,
  source: z.enum(["convex", "fixture"]),
  selectedAt: z.string().datetime(),
  rank: z.number().int().positive().optional(),
});

export type SelectedMunicipalityReportContext = z.infer<
  typeof selectedMunicipalityReportContextSchema
>;

export const generateRemediationReportResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("pending"),
      metadata: pendingReportMetadataSchema,
    }),
    z.object({
      status: z.literal("completed"),
      report: remediationReportSchema,
      reports: remediationReportVariantsSchema,
      metadata: completedReportMetadataSchema,
    }),
    z.object({
      status: z.literal("failed"),
      metadata: failedReportMetadataSchema,
      error: z.string().min(1),
    }),
  ],
);

export type GenerateRemediationReportResult = z.infer<
  typeof generateRemediationReportResultSchema
>;

export const generateRemediationReportBatchRecordSchema = z.object({
  municipalityId: z.string().min(1),
  rank: z.number().int().positive().optional(),
  result: generateRemediationReportResultSchema,
});

export type GenerateRemediationReportBatchRecord = z.infer<
  typeof generateRemediationReportBatchRecordSchema
>;

export const generateRemediationReportBatchOutputSchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().datetime(),
  provider: z.enum(["deterministic-fallback", "tanstack-ai"]),
  summary: z.object({
    requested: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  results: z.array(generateRemediationReportBatchRecordSchema),
});

export type GenerateRemediationReportBatchOutput = z.infer<
  typeof generateRemediationReportBatchOutputSchema
>;

export const REPORT_GENERATION_MAX_LIMIT = 1_000;

export const reportGenerationCliOptionsSchema = z.object({
  generatedAt: z.string().datetime(),
  limit: z.number().int().min(1).max(REPORT_GENERATION_MAX_LIMIT),
  outputPath: z.string().min(1),
});

export type ReportGenerationCliOptions = z.infer<
  typeof reportGenerationCliOptionsSchema
>;

export const reportGenerationArtifactSchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().datetime(),
  provider: z.enum(["deterministic-fallback", "tanstack-ai"]),
  selected: z.array(selectedMunicipalityReportContextSchema),
  batch: generateRemediationReportBatchOutputSchema,
  convexPersistenceArgs: z.array(reportPersistenceArgsSchema),
  persistence: z.object({
    argsCommand: z.string().min(1),
    liveConvexCommand: z.string().min(1),
    note: z.string().min(1),
  }),
});

export type ReportGenerationArtifact = z.infer<
  typeof reportGenerationArtifactSchema
>;

export const userProfileSchema = z.object({
  id: z.string().min(1),
  tokenIdentifier: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
  roles: z.array(appRoleSchema),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const generateRemediationReportInputSchema = z
  .object({
    municipality: municipalitySchema.optional(),
    scan: scanResultSchema.optional(),
    generatedAt: z.string().datetime().optional(),
    sourceData: z.unknown().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.scan && value.sourceData === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Report generation input requires scan data or sourceData for normalization.",
      });
    }
  });

export type GenerateRemediationReportInput = z.infer<
  typeof generateRemediationReportInputSchema
>;

export type GenerateRemediationReport = (
  input: GenerateRemediationReportInput,
) => Promise<RemediationReport>;

export type GenerateRemediationReportVariants = (
  input: GenerateRemediationReportInput,
) => Promise<RemediationReportVariants>;

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
