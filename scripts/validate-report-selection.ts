import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  generateRemediationReportInputSchema,
  municipalitySchema,
  scanResultSchema,
  selectedMunicipalityReportContextSchema,
  type Municipality,
  type ScanResult,
} from "../src/shared/contracts.ts";

const municipalities = municipalitySchema.array().parse(municipalitiesFixture);
const scans = scanResultSchema.array().parse(enrichedScanFixture);

const selected = selectTopRiskReportContexts({
  municipalities,
  scans,
  source: "fixture",
  selectedAt: "2026-01-01T00:00:00.000Z",
});

if (selected.length !== 10) {
  throw new Error(
    `Expected 10 selected report contexts, received ${selected.length}.`,
  );
}

for (const context of selected) {
  selectedMunicipalityReportContextSchema.parse(context);
  generateRemediationReportInputSchema.parse({
    municipality: context.municipality,
    scan: context.scan,
  });
}

for (let index = 1; index < selected.length; index += 1) {
  const previous = selected[index - 1];
  const current = selected[index];

  if (previous.scan.riskScore < current.scan.riskScore) {
    throw new Error(
      "Selected report contexts must be sorted by descending riskScore.",
    );
  }

  if (previous.scan.riskScore === current.scan.riskScore) {
    const previousId = previous.municipality.id;
    const currentId = current.municipality.id;

    if (previousId.localeCompare(currentId) > 0) {
      throw new Error(
        "Risk score ties must be ordered by municipality id for deterministic output.",
      );
    }
  }
}

selected.forEach((context, index) => {
  if (context.rank !== index + 1) {
    throw new Error(`Expected rank ${index + 1}, received ${context.rank}.`);
  }

  if (context.scan.findings.length === 0) {
    throw new Error(
      "Selected report contexts must have at least one reportable finding.",
    );
  }
});

const testMunicipalities: Municipality[] = [
  {
    id: "alpha",
    name: "Alpha",
    state: "Test",
    websiteUrl: "https://alpha.example.test",
    riskTier: "medium",
  },
  {
    id: "beta",
    name: "Beta",
    state: "Test",
    websiteUrl: "https://beta.example.test",
    riskTier: "medium",
  },
  {
    id: "empty",
    name: "Empty",
    state: "Test",
    websiteUrl: "https://empty.example.test",
    riskTier: "low",
  },
];

const baseFinding: ScanResult["findings"][number] = {
  id: "finding-1",
  category: "headers",
  severity: "high",
  title: "Missing security header",
  description: "The site is missing a security header.",
  evidence: "x-frame-options header not observed",
  remediationHint: "Add the missing security header.",
};

const testScans: ScanResult[] = [
  {
    id: "scan-beta",
    municipalityId: "beta",
    scannedAt: "2026-01-01T00:00:00.000Z",
    riskScore: 75,
    riskLevel: "high",
    findings: [baseFinding],
  },
  {
    id: "scan-alpha",
    municipalityId: "alpha",
    scannedAt: "2026-01-01T00:00:00.000Z",
    riskScore: 75,
    riskLevel: "medium",
    findings: [baseFinding],
  },
  {
    id: "scan-empty",
    municipalityId: "empty",
    scannedAt: "2026-01-01T00:00:00.000Z",
    riskScore: 100,
    riskLevel: "critical",
    findings: [],
  },
  {
    id: "scan-missing-municipality",
    municipalityId: "missing",
    scannedAt: "2026-01-01T00:00:00.000Z",
    riskScore: 99,
    riskLevel: "critical",
    findings: [baseFinding],
  },
];

const smallSelection = selectTopRiskReportContexts({
  municipalities: testMunicipalities,
  scans: testScans,
  source: "fixture",
  selectedAt: "2026-01-01T00:00:00.000Z",
});

if (smallSelection.length !== 2) {
  throw new Error(
    `Expected all 2 reportable records, received ${smallSelection.length}.`,
  );
}

if (
  smallSelection.map((context) => context.municipality.id).join(",") !==
  "alpha,beta"
) {
  throw new Error(
    "Fewer-than-10 selection should preserve deterministic tie ordering.",
  );
}

console.log("Report selection validation passed.");
