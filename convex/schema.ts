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
    v.literal("availability"),
  ),
  severity,
  title: v.string(),
  description: v.string(),
  evidence: v.string(),
  remediationHint: v.string(),
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
    score: v.number(),
    findings: v.array(finding),
  })
    .index("by_externalId", ["externalId"])
    .index("by_municipalityId", ["municipalityId"]),
  remediationReports: defineTable({
    externalId: v.string(),
    municipalityId: v.id("municipalities"),
    scanResultId: v.optional(v.id("scanResults")),
    generatedAt: v.string(),
    summary: v.string(),
    priorityActions: v.array(v.string()),
    findings: v.array(finding),
    generatedBy: v.union(v.literal("deterministic-fallback"), v.literal("ai-provider")),
  })
    .index("by_externalId", ["externalId"])
    .index("by_municipalityId", ["municipalityId"]),
  userProfiles: defineTable({
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    roles: v.array(v.union(v.literal("viewer"), v.literal("operator"), v.literal("admin"))),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),
});
