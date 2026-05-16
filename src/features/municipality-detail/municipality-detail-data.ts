import {
  type MunicipalityDetail,
  municipalityDetailSchema,
} from "../../shared/contracts.ts";

export type MunicipalityDetailSource = "convex" | "mock";

export type MunicipalityDetailState =
  | {
      status: "loading";
      source: MunicipalityDetailSource;
      id: string;
    }
  | {
      status: "ready";
      source: MunicipalityDetailSource;
      id: string;
      detail: MunicipalityDetail;
      scanStatus: "available" | "missing";
      reportStatus: "available" | "missing";
    }
  | {
      status: "not-found";
      source: MunicipalityDetailSource;
      id: string;
    }
  | {
      status: "error";
      source: MunicipalityDetailSource;
      id: string;
      message: string;
    };

// Demo-only fallback matching api.municipalities.get when VITE_CONVEX_URL is unavailable.
export const municipalityDetailMockItems = [
  {
    municipality: {
      id: "mx-bcn-tijuana",
      name: "Tijuana",
      state: "Baja California",
      websiteUrl: "https://www.tijuana.gob.mx",
      population: 1810645,
      latitude: 32.5149,
      longitude: -117.0382,
      sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
      riskTier: "medium",
    },
    scan: {
      id: "scan-mx-bcn-tijuana-2026-05-16",
      municipalityId: "mx-bcn-tijuana",
      scannedAt: "2026-05-16T09:30:00.000Z",
      requestedUrl: "https://www.tijuana.gob.mx",
      finalUrl: "https://www.tijuana.gob.mx/",
      reachable: true,
      httpStatus: 200,
      riskScore: 84,
      riskLevel: "critical",
      findings: [
        {
          id: "finding-mx-bcn-tijuana-tls",
          category: "tls",
          severity: "high",
          title: "TLS certificate needs review",
          description: "Observed public signals indicate the TLS configuration should be reviewed.",
          evidence: "Certificate metadata reported a short remaining validity window.",
          remediationHint: "Renew the certificate and verify automated renewal monitoring.",
        },
      ],
    },
    report: {
      reportId: "report-mx-bcn-tijuana-2026-05-16",
      municipalityId: "mx-bcn-tijuana",
      status: "completed",
      generatedAt: "2026-05-16T09:35:00.000Z",
      updatedAt: "2026-05-16T09:36:00.000Z",
      pdf: {
        storagePath: "data/reports/mx-bcn-tijuana-technical.pdf",
        fileName: "mx-bcn-tijuana-technical.pdf",
        contentType: "application/pdf",
        generatedAt: "2026-05-16T09:36:00.000Z",
        sizeBytes: 24576,
      },
      artifacts: {
        technical: {
          variant: "technical",
          label: "Technical report PDF",
          pdf: {
            storagePath: "data/reports/mx-bcn-tijuana-technical.pdf",
            fileName: "mx-bcn-tijuana-technical.pdf",
            contentType: "application/pdf",
            generatedAt: "2026-05-16T09:36:00.000Z",
            sizeBytes: 24576,
          },
        },
        friendly: {
          variant: "friendly",
          label: "Friendly report PDF",
          pdf: {
            storagePath: "data/reports/mx-bcn-tijuana-friendly.pdf",
            fileName: "mx-bcn-tijuana-friendly.pdf",
            contentType: "application/pdf",
            generatedAt: "2026-05-16T09:36:00.000Z",
            sizeBytes: 23810,
          },
        },
      },
    },
  },
  {
    municipality: {
      id: "mx-jalisco-guadalajara",
      name: "Guadalajara",
      state: "Jalisco",
      websiteUrl: "https://guadalajara.gob.mx",
      population: 1385629,
      latitude: 20.6597,
      longitude: -103.3496,
      sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
      riskTier: "medium",
    },
    scan: {
      id: "scan-mx-jalisco-guadalajara-2026-05-16",
      municipalityId: "mx-jalisco-guadalajara",
      scannedAt: "2026-05-16T09:40:00.000Z",
      requestedUrl: "https://guadalajara.gob.mx",
      reachable: true,
      httpStatus: 200,
      riskScore: 72,
      riskLevel: "high",
      findings: [],
    },
    report: null,
  },
  {
    municipality: {
      id: "mx-nl-monterrey",
      name: "Monterrey",
      state: "Nuevo Leon",
      websiteUrl: "https://www.monterrey.gob.mx",
      population: 1142994,
      latitude: 25.6866,
      longitude: -100.3161,
      sourceUrl: "https://www.inegi.org.mx/programas/ccpv/2020/",
      riskTier: "medium",
    },
    scan: null,
    report: null,
  },
] satisfies MunicipalityDetail[];

export function getMunicipalityDetailSource(convexUrl: string | undefined): MunicipalityDetailSource {
  return convexUrl ? "convex" : "mock";
}

export function getMockMunicipalityDetailState(id: string): MunicipalityDetailState {
  return toMunicipalityDetailState(
    municipalityDetailMockItems.find((detail) => detail.municipality.id === id) ?? null,
    "mock",
    id,
  );
}

export function toMunicipalityDetailState(
  result: MunicipalityDetail | null | Error | undefined,
  source: MunicipalityDetailSource,
  id: string,
): MunicipalityDetailState {
  if (result === undefined) {
    return { status: "loading", source, id };
  }

  if (result instanceof Error) {
    return { status: "error", source, id, message: result.message };
  }

  if (result === null) {
    return { status: "not-found", source, id };
  }

  const detail = municipalityDetailSchema.parse(result);

  return {
    status: "ready",
    source,
    id,
    detail,
    scanStatus: detail.scan ? "available" : "missing",
    reportStatus: detail.report ? "available" : "missing",
  };
}
