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

<<<<<<< HEAD
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

export const reportSectionSchema = z.object({
  title: z.string().min(1),
  narrative: z.string().min(1),
  bullets: z.array(z.string().min(1)).default([]),
});

=======
>>>>>>> 0f8895e (feat(contracts): add OpenBreach contract layer for generic security-validation)
export const remediationReportSchema = z.object({
  id: z.string().min(1),
  municipalityId: z.string().min(1),
  generatedAt: z.string().datetime(),
  summary: z.string().min(1),
  priorityActions: z.array(z.string().min(1)),
  findings: z.array(scanFindingSchema),
  generatedBy: z.enum(["deterministic-fallback", "ai-provider"]),
});

export type RemediationReport = z.infer<typeof remediationReportSchema>;
<<<<<<< HEAD
export type ReportFinding = RemediationReport["findings"][number];
export type ReportAudience = RemediationReport["variant"];

export const remediationReportVariantsSchema = z.object({
  technical: remediationReportSchema,
  friendly: remediationReportSchema,
});

export type RemediationReportVariants = z.infer<
  typeof remediationReportVariantsSchema
>;
=======
>>>>>>> 0f8895e (feat(contracts): add OpenBreach contract layer for generic security-validation)

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

<<<<<<< HEAD
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

=======
>>>>>>> 0f8895e (feat(contracts): add OpenBreach contract layer for generic security-validation)
const reportMetadataBaseSchema = z.object({
  reportId: z.string().min(1),
  municipalityId: z.string().min(1),
  generatedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  pdf: reportPdfReferenceSchema.optional(),
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

<<<<<<< HEAD
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
=======
export const generateRemediationReportResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("pending"),
    metadata: pendingReportMetadataSchema,
  }),
  z.object({
    status: z.literal("completed"),
    report: remediationReportSchema,
    metadata: completedReportMetadataSchema,
  }),
  z.object({
    status: z.literal("failed"),
    metadata: failedReportMetadataSchema,
    error: z.string().min(1),
  }),
]);
>>>>>>> 0f8895e (feat(contracts): add OpenBreach contract layer for generic security-validation)

export type GenerateRemediationReportResult = z.infer<
  typeof generateRemediationReportResultSchema
>;

export const userProfileSchema = z.object({
  id: z.string().min(1),
  tokenIdentifier: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
  roles: z.array(appRoleSchema),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

<<<<<<< HEAD
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
=======
export const generateRemediationReportInputSchema = z.object({
  municipality: municipalitySchema,
  scan: scanResultSchema,
});
>>>>>>> 0f8895e (feat(contracts): add OpenBreach contract layer for generic security-validation)

export type GenerateRemediationReportInput = z.infer<
  typeof generateRemediationReportInputSchema
>;

export type GenerateRemediationReport = (
  input: GenerateRemediationReportInput,
) => Promise<RemediationReport>;

// ============================================================
// OpenBreach Contract Layer — Phase 1: Schemas
// ============================================================

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const targetProfileSchema = z.object({
  targetId: z.string().min(1),
  assetId: z.string().min(1),
  organizationName: z.string().min(1),
  canonicalUrl: z.string().url(),
  outOfScope: z.boolean().optional().default(false),
});
export type TargetProfile = z.infer<typeof targetProfileSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const authorizationScopeSchema = z.object({
  scopeId: z.string().min(1),
  targetId: z.string().min(1),
  authorizedUrls: z.array(z.string().url()).min(1),
  authorizedMethods: z.array(z.enum(["GET", "HEAD", "OPTIONS"])).default(["GET", "HEAD", "OPTIONS"]),
  authorizedCategories: z.array(z.enum(["tls", "headers", "cms", "exposure", "availability", "known-vulnerability"])).default(["tls", "headers", "cms", "exposure", "availability", "known-vulnerability"]),
  maxDepth: z.number().int().nonnegative().default(3),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  agentId: z.string().min(1),
  legalBasis: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  const fromTime = Date.parse(data.validFrom);
  const untilTime = Date.parse(data.validUntil);
  if (isNaN(fromTime) || isNaN(untilTime)) return;
  if (untilTime <= fromTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validUntil must be strictly after validFrom",
      path: ["validUntil"],
    });
  }
});
export type AuthorizationScope = z.infer<typeof authorizationScopeSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const workflowRunStatusSchema = z.enum(["hypothesis", "approved", "confirmed", "skipped", "halted", "rejected"]);
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const workflowRunSchema = z.object({
  runId: z.string().min(1),
  scopeId: z.string().min(1),
  targetId: z.string().min(1),
  status: workflowRunStatusSchema,
  hypothesisId: z.string().optional(),
  testPlanId: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  agentId: z.string().min(1),
  evidenceEnvelopeId: z.string().optional(),
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const passiveScanEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  runId: z.string().min(1),
  targetId: z.string().min(1),
  collectedAt: z.string().datetime(),
  sourceAgent: z.string().min(1),
  observationType: z.enum(["response-header", "resource-load", "tls-version", "content-match"]),
  rawData: z.record(z.unknown()),
  canonicalUrl: z.string().url(),
  evidenceRefs: z.array(z.string()).optional(),
});
export type PassiveScanEvidence = z.infer<typeof passiveScanEvidenceSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const technologyFingerprintSchema = z.object({
  fingerprintId: z.string().min(1),
  targetId: z.string().min(1),
  runId: z.string().min(1),
  technology: z.string().min(1),
  version: z.string().optional(),
  category: z.enum(["cms", "framework", "library", "server", "cdn", "other"]),
  evidenceIds: z.array(z.string()).min(1),
  confidence: z.enum(["low", "medium", "high"]),
  identifiedAt: z.string().datetime(),
  sourceAgent: z.string().min(1),
});
export type TechnologyFingerprint = z.infer<typeof technologyFingerprintSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const vulnerabilityHypothesisSchema = z.object({
  hypothesisId: z.string().min(1),
  targetId: z.string().min(1),
  runId: z.string().min(1),
  category: z.enum(["tls", "headers", "cms", "exposure", "availability", "known-vulnerability"]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  title: z.string().min(1),
  description: z.string().min(10),
  evidenceIds: z.array(z.string()).min(1),
  confidence: z.enum(["low", "medium", "high"]),
  createdAt: z.string().datetime(),
  sourceAgent: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});
export type VulnerabilityHypothesis = z.infer<typeof vulnerabilityHypothesisSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const testPlanSchema = z.object({
  testPlanId: z.string().min(1),
  runId: z.string().min(1),
  scopeId: z.string().min(1),
  strategy: z.enum(["passive-only", "passive-aggressive"]),
  plannedCategories: z.array(z.enum(["tls", "headers", "cms", "exposure", "availability", "known-vulnerability"])),
  plannedChecks: z.array(z.object({
    checkId: z.string().min(1),
    category: z.enum(["tls", "headers", "cms", "exposure", "availability", "known-vulnerability"]),
    description: z.string().min(1),
  })),
  createdAt: z.string().datetime(),
  agentId: z.string().min(1),
});
export type TestPlan = z.infer<typeof testPlanSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const approvalGateStatusSchema = z.enum(["pending", "approved", "rejected", "expired", "revoked"]);
export type ApprovalGateStatus = z.infer<typeof approvalGateStatusSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const approvalGateSchema = z.object({
  gateId: z.string().min(1),
  hypothesisId: z.string().min(1),
  scopeId: z.string().min(1),
  status: approvalGateStatusSchema,
  requestedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
  reviewerId: z.string().optional(),
  reviewNotes: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  sourceAgent: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.status === "approved" || data.status === "rejected") {
    if (!data.reviewedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reviewedAt is required when status is approved or rejected",
        path: ["reviewedAt"],
      });
    }
    if (!data.reviewerId || data.reviewerId.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reviewerId is required when status is approved or rejected",
        path: ["reviewerId"],
      });
    }
  }
});
export type ApprovalGate = z.infer<typeof approvalGateSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const validationResultStatusSchema = z.enum(["confirmed", "skipped", "halted", "rejected"]);
export type ValidationResultStatus = z.infer<typeof validationResultStatusSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const validationResultSchema = z.object({
  resultId: z.string().min(1),
  hypothesisId: z.string().min(1),
  gateId: z.string().min(1),
  runId: z.string().min(1),
  status: validationResultStatusSchema,
  executedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  evidenceIds: z.array(z.string()),
  findings: z.array(z.string()).optional(),
  agentId: z.string().min(1),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === "confirmed" || data.status === "rejected") {
    if (!data.completedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completedAt is required for terminal status (confirmed/rejected)",
        path: ["completedAt"],
      });
    }
  }
});
export type ValidationResult = z.infer<typeof validationResultSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const evidenceEnvelopeSchema = z.object({
  envelopeId: z.string().min(1),
  runId: z.string().min(1),
  targetId: z.string().min(1),
  evidenceIds: z.array(z.string()),
  createdAt: z.string().datetime(),
  sourceAgent: z.string().min(1),
});
export type EvidenceEnvelope = z.infer<typeof evidenceEnvelopeSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const findingSeveritySchema = z.enum(["info", "low", "medium", "high", "critical"]);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const findingCategorySchema = z.enum(["tls", "headers", "cms", "exposure", "availability", "known-vulnerability"]);
export type FindingCategory = z.infer<typeof findingCategorySchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const findingSchema = z.object({
  findingId: z.string().min(1),
  resultId: z.string().min(1),
  hypothesisId: z.string().min(1),
  targetId: z.string().min(1),
  severity: findingSeveritySchema,
  category: findingCategorySchema,
  title: z.string().min(1),
  description: z.string().min(10),
  evidenceIds: z.array(z.string()).min(1),
  cveId: z.string().optional(),
  cweId: z.string().optional(),
  createdAt: z.string().datetime(),
  sourceAgent: z.string().min(1),
  confirmedBy: z.string().min(1),
});
export type Finding = z.infer<typeof findingSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const reportArtifactSchema = z.object({
  artifactId: z.string().min(1),
  runId: z.string().min(1),
  targetId: z.string().min(1),
  artifactType: z.enum(["summary", "detailed", "executive", "technical"]),
  format: z.enum(["json", "markdown", "html"]),
  content: z.record(z.unknown()),
  findingIds: z.array(z.string()),
  generatedAt: z.string().datetime(),
  generatedBy: z.string().min(1),
  version: z.string().default("1.0.0"),
});
export type ReportArtifact = z.infer<typeof reportArtifactSchema>;

// NOTE: If you modify this schema, update the corresponding Convex validator in convex/schema.ts
export const auditEventSchema = z.object({
  eventId: z.string().min(1),
  timestamp: z.string().datetime(),
  eventType: z.enum([
    "scope_created",
    "workflow_started",
    "workflow_completed",
    "hypothesis_created",
    "gate_requested",
    "gate_approved",
    "gate_rejected",
    "validation_executed",
    "finding_confirmed",
    "report_generated",
  ]),
  agentId: z.string().min(1),
  targetId: z.string().optional(),
  runId: z.string().optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;
