import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import reportFixture from "../data/reports/sample-report.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import {
  municipalitySchema,
  remediationReportSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

municipalitySchema.parse(municipalityFixture);
scanResultSchema.parse(scanFixture);
remediationReportSchema.parse(reportFixture);

console.log("Fixture validation passed.");
