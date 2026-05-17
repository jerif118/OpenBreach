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
