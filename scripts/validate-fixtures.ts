import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import reportFixture from "../data/reports/sample-report.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import rawScanEvidenceFixture from "../data/scans/sample-raw-scan-evidence.json" with { type: "json" };
import {
  municipalitySchema,
  rawScanEvidenceSchema,
  remediationReportSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

municipalitySchema.parse(municipalityFixture);
scanResultSchema.parse(scanFixture);
scanResultSchema.array().parse(enrichedScanFixture);
rawScanEvidenceSchema.parse(rawScanEvidenceFixture);
remediationReportSchema.parse(reportFixture);

console.log("Fixture validation passed.");
