import { v } from "convex/values";

export const riskTierValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

export const classificationValidator = v.union(
  v.literal("public-sector"),
  v.literal("private"),
  v.literal("infrastructure"),
  v.literal("other"),
);

export const geographyValidator = v.object({
  country: v.string(),
  region: v.string(),
  city: v.string(),
});

export const targetListArgsValidator = {
  limit: v.optional(v.number()),
  riskTier: v.optional(riskTierValidator),
};

export const createTargetArgsValidator = {
  targetId: v.string(),
  name: v.string(),
  primaryUrl: v.string(),
  riskTier: riskTierValidator,
  classification: classificationValidator,
  parentOrganization: v.optional(v.string()),
  geography: v.optional(geographyValidator),
  population: v.optional(v.number()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  metadata: v.optional(v.record(v.string(), v.any())),
};

export const updateTargetArgsValidator = {
  targetId: v.string(),
  name: v.optional(v.string()),
  primaryUrl: v.optional(v.string()),
  riskTier: v.optional(riskTierValidator),
  classification: v.optional(classificationValidator),
  parentOrganization: v.optional(v.string()),
  geography: v.optional(geographyValidator),
  population: v.optional(v.number()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  metadata: v.optional(v.record(v.string(), v.any())),
};
