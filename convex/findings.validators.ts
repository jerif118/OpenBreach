import { v } from "convex/values";

const severityValidator = v.union(
  v.literal("info"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const statusValidator = v.union(
  v.literal("observed"),
  v.literal("confirmed"),
  v.literal("likely"),
  v.literal("skipped"),
  v.literal("unresolved"),
  v.literal("false-positive"),
);

const categoryValidator = v.union(
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

const confidenceValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const optionalFindingFields = {
  category: v.optional(categoryValidator),
  evidence: v.optional(v.string()),
  remediationHint: v.optional(v.string()),
  affectedAssets: v.optional(v.array(v.string())),
  confidence: v.optional(confidenceValidator),
  cweId: v.optional(v.string()),
  cvssScore: v.optional(v.number()),
  validationResultId: v.optional(v.string()),
  reportReady: v.optional(v.boolean()),
  runId: v.optional(v.string()),
};

export const listByTargetArgs = {
  targetId: v.string(),
  severity: v.optional(severityValidator),
  limit: v.optional(v.number()),
};

export const listByValidationResultArgs = {
  validationResultId: v.string(),
  limit: v.optional(v.number()),
};

export const createArgs = {
  findingId: v.string(),
  targetId: v.string(),
  title: v.string(),
  description: v.string(),
  severity: severityValidator,
  status: statusValidator,
  createdAt: v.string(),
  ...optionalFindingFields,
};

export const updateArgs = {
  findingId: v.string(),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  severity: v.optional(severityValidator),
  status: v.optional(statusValidator),
  ...optionalFindingFields,
};
