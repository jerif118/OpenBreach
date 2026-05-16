import type { GenerateRemediationReport, RemediationReport } from "~/shared";

export type ReportAiProvider = "deterministic-fallback" | "tanstack-ai";

export type ReportAiAdapter = {
  provider: ReportAiProvider;
  generateRemediationReport: GenerateRemediationReport;
};

function getConfiguredProviderKey() {
  return import.meta.env?.VITE_AI_PROVIDER_KEY ?? process.env.VITE_AI_PROVIDER_KEY;
}

export function createReportAiAdapter(providerKey = getConfiguredProviderKey()): ReportAiAdapter {
  if (!providerKey) {
    return deterministicReportAdapter;
  }

  return {
    provider: "tanstack-ai",
    generateRemediationReport: deterministicReportAdapter.generateRemediationReport,
  };
}

export const deterministicReportAdapter: ReportAiAdapter = {
  provider: "deterministic-fallback",
  async generateRemediationReport({ municipality, scan }): Promise<RemediationReport> {
    const highPriorityFindings = scan.findings.filter((finding) =>
      ["critical", "high"].includes(finding.severity),
    );

    return {
      id: `report-${scan.id}`,
      municipalityId: municipality.id,
      generatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      summary: `${municipality.name} has a ${municipality.riskTier} baseline risk tier with ${scan.findings.length} observed passive scan findings.`,
      priorityActions: (highPriorityFindings.length ? highPriorityFindings : scan.findings)
        .slice(0, 3)
        .map((finding) => finding.remediationHint),
      findings: scan.findings,
      generatedBy: "deterministic-fallback",
    };
  },
};
