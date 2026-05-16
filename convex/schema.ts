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

const rawScanHeaders = v.record(v.string(), v.string());

const rawScanTls = v.object({
  valid: v.boolean(),
  expiresAt: v.optional(v.string()),
  issuer: v.optional(v.string()),
});

const rawScanCms = v.object({
  name: v.union(v.literal("wordpress"), v.literal("joomla"), v.literal("drupal"), v.literal("unknown")),
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
  stage: v.union(v.literal("http"), v.literal("tls"), v.literal("cms"), v.literal("admin-exposure")),
  message: v.string(),
});

const riskLevel = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const reportStatus = v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"));

const reportPdfReference = v.object({
  storagePath: v.string(),
  fileName: v.string(),
  contentType: v.literal("application/pdf"),
  generatedAt: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
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
    findings: v.optional(v.array(finding)),
    generatedBy: v.optional(v.union(v.literal("deterministic-fallback"), v.literal("ai-provider"))),
    pdf: v.optional(reportPdfReference),
    error: v.optional(v.string()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_municipalityId", ["municipalityId"])
    .index("by_municipalityId_and_generatedAt", ["municipalityId", "generatedAt"]),
  userProfiles: defineTable({
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    roles: v.array(v.union(v.literal("viewer"), v.literal("operator"), v.literal("admin"))),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),
});
