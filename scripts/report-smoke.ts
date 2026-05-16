import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import { createReportAiAdapter } from "../src/ai/report-adapter.ts";
import {
  municipalitySchema,
  remediationReportSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

const municipality = municipalitySchema.parse(municipalityFixture);
const scan = scanResultSchema.parse(scanFixture);
const report = await createReportAiAdapter().generateRemediationReport({ municipality, scan });

remediationReportSchema.parse(report);
console.log(JSON.stringify(report, null, 2));
