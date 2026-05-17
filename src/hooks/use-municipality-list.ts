import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api.js";

export type MunicipalityListItem = {
  id: string;
  name: string;
  state: string;
  websiteUrl: string;
  population?: number;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string;
  riskTier: "low" | "medium" | "high" | "critical";
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
};

export interface UseMunicipalityListReturn {
  municipalities: MunicipalityListItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useMunicipalityList(): UseMunicipalityListReturn {
  const result = useQuery(api.municipalities.list, {});

  if (result === undefined) {
    return { municipalities: [], isLoading: true, error: null };
  }

  return { municipalities: result, isLoading: false, error: null };
}