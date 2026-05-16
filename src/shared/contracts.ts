import { z } from "zod";

export const appRoleSchema = z.enum(["viewer", "operator", "admin"]);

export type AppRole = z.infer<typeof appRoleSchema>;

export const municipalitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  state: z.string().min(1),
  websiteUrl: z.string().url(),
  population: z.number().int().nonnegative().optional(),
  riskTier: z.enum(["low", "medium", "high", "critical"]),
});

export type Municipality = z.infer<typeof municipalitySchema>;

export const scanFindingSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["tls", "headers", "cms", "exposure", "availability"]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  title: z.string().min(1),
  description: z.string().min(1),
  evidence: z.string().min(1),
  remediationHint: z.string().min(1),
});

export type ScanFinding = z.infer<typeof scanFindingSchema>;

export const scanResultSchema = z.object({
  id: z.string().min(1),
  municipalityId: z.string().min(1),
  scannedAt: z.string().datetime(),
  score: z.number().min(0).max(100),
  findings: z.array(scanFindingSchema),
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

export const userProfileSchema = z.object({
  id: z.string().min(1),
  clerkUserId: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
  roles: z.array(appRoleSchema),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const generateRemediationReportInputSchema = z.object({
  municipality: municipalitySchema,
  scan: scanResultSchema,
});

export type GenerateRemediationReportInput = z.infer<
  typeof generateRemediationReportInputSchema
>;

export type GenerateRemediationReport = (
  input: GenerateRemediationReportInput,
) => Promise<RemediationReport>;
