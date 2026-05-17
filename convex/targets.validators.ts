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

export function validateTargetDomainBounds(args: {
  population?: number;
  latitude?: number;
  longitude?: number;
}) {
  if (
    args.population !== undefined &&
    (!Number.isFinite(args.population) ||
      !Number.isInteger(args.population) ||
      args.population < 0)
  ) {
    throw new Error("Target population must be a non-negative integer.");
  }

  if (
    args.latitude !== undefined &&
    (!Number.isFinite(args.latitude) ||
      args.latitude < -90 ||
      args.latitude > 90)
  ) {
    throw new Error("Target latitude must be between -90 and 90.");
  }

  if (
    args.longitude !== undefined &&
    (!Number.isFinite(args.longitude) ||
      args.longitude < -180 ||
      args.longitude > 180)
  ) {
    throw new Error("Target longitude must be between -180 and 180.");
  }
}
