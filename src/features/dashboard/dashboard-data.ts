import type { MunicipalityListItem } from "../../shared/contracts.ts";

export type DashboardMunicipalitySource = "convex" | "mock";

export type DashboardMunicipalityState =
  | {
      status: "loading";
      source: DashboardMunicipalitySource;
      items: [];
    }
  | {
      status: "ready";
      source: DashboardMunicipalitySource;
      items: MunicipalityListItem[];
    }
  | {
      status: "empty";
      source: DashboardMunicipalitySource;
      items: [];
    }
  | {
      status: "error";
      source: DashboardMunicipalitySource;
      items: [];
      message: string;
    };

// Demo-only fallback matching api.municipalities.list when VITE_CONVEX_URL is unavailable.
export const dashboardMunicipalityMockItems = [
  {
    id: "mx-bcn-tijuana",
    name: "Tijuana",
    state: "Baja California",
    websiteUrl: "https://www.tijuana.gob.mx",
    population: 1810645,
    latitude: 32.5149,
    longitude: -117.0382,
    sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
    riskTier: "medium",
    riskScore: 84,
    riskLevel: "critical",
  },
  {
    id: "mx-jalisco-guadalajara",
    name: "Guadalajara",
    state: "Jalisco",
    websiteUrl: "https://guadalajara.gob.mx",
    population: 1385629,
    latitude: 20.6597,
    longitude: -103.3496,
    sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
    riskTier: "medium",
    riskScore: 72,
    riskLevel: "high",
  },
  {
    id: "mx-nl-monterrey",
    name: "Monterrey",
    state: "Nuevo Leon",
    websiteUrl: "https://www.monterrey.gob.mx",
    population: 1142994,
    latitude: 25.6866,
    longitude: -100.3161,
    sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
    riskTier: "medium",
    riskScore: 58,
    riskLevel: "medium",
  },
  {
    id: "mx-cdmx-iztapalapa",
    name: "Iztapalapa",
    state: "Ciudad de Mexico",
    websiteUrl: "https://www.iztapalapa.cdmx.gob.mx",
    population: 1835486,
    latitude: 19.3574,
    longitude: -99.0671,
    sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
    riskTier: "medium",
    riskScore: 41,
    riskLevel: "medium",
  },
  {
    id: "mx-yucatan-merida",
    name: "Merida",
    state: "Yucatan",
    websiteUrl: "https://www.merida.gob.mx",
    population: 995129,
    latitude: 20.9674,
    longitude: -89.5926,
    sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
    riskTier: "medium",
    riskScore: 18,
    riskLevel: "low",
  },
] satisfies MunicipalityListItem[];

export function getDashboardMunicipalitySource(convexUrl: string | undefined) {
  return convexUrl ? "convex" : "mock";
}

export function getMockDashboardMunicipalityState(): DashboardMunicipalityState {
  return toDashboardMunicipalityState(dashboardMunicipalityMockItems, "mock");
}

export function toDashboardMunicipalityState(
  result: MunicipalityListItem[] | Error | undefined,
  source: DashboardMunicipalitySource,
): DashboardMunicipalityState {
  if (result === undefined) {
    return { status: "loading", source, items: [] };
  }

  if (result instanceof Error) {
    return { status: "error", source, items: [], message: result.message };
  }

  if (result.length === 0) {
    return { status: "empty", source, items: [] };
  }

  return { status: "ready", source, items: result };
}
