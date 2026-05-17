import type { GeographyDto } from "./geography";

export type TargetProfileDto = {
  targetId: string;
  name: string;
  primaryUrl: string;
  riskTier: "low" | "medium" | "high" | "critical";
  classification: "public-sector" | "private" | "infrastructure" | "other";
  parentOrganization?: string;
  geography?: GeographyDto;
  population?: number;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
};

export type TargetListItemDto = {
  targetId: string;
  name: string;
  primaryUrl: string;
  riskTier: "low" | "medium" | "high" | "critical";
  classification: "public-sector" | "private" | "infrastructure" | "other";
};
