import {
  selectedMunicipalityReportContextSchema,
  type SelectedMunicipalityReportContext,
} from "../../shared/contracts.ts";
import type { Municipality, ScanResult } from "~/shared";

export type ReportContext = {
  municipality: Municipality;
  scan: ScanResult;
};

export function buildReportContext(municipality: Municipality, scan: ScanResult): ReportContext {
  return { municipality, scan };
}

export type SelectTopRiskReportContextsInput = {
  municipalities: Municipality[];
  scans: ScanResult[];
  source: SelectedMunicipalityReportContext["source"];
  selectedAt: string;
  limit?: number;
};

export function selectTopRiskReportContexts({
  municipalities,
  scans,
  source,
  selectedAt,
  limit = 10,
}: SelectTopRiskReportContextsInput): SelectedMunicipalityReportContext[] {
  const municipalitiesById = new Map(
    municipalities.map((municipality) => [municipality.id, municipality]),
  );

  return scans
    .flatMap((scan) => {
      const municipality = municipalitiesById.get(scan.municipalityId);

      if (!municipality || scan.findings.length === 0) {
        return [];
      }

      return [{ municipality, scan }];
    })
    .sort((left, right) => {
      const riskScoreOrder = right.scan.riskScore - left.scan.riskScore;

      if (riskScoreOrder !== 0) {
        return riskScoreOrder;
      }

      return left.municipality.id.localeCompare(right.municipality.id);
    })
    .slice(0, limit)
    .map((context, index) =>
      selectedMunicipalityReportContextSchema.parse({
        ...context,
        source,
        selectedAt,
        rank: index + 1,
      }),
    );
}
