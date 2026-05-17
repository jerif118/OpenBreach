import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import { municipalitySchema, scanResultSchema } from "../src/shared/contracts.ts";
import { runReportPdfValidation } from "./report-pdf-validation-pipeline.ts";
import { assertPdfTextEscapesLiteralControls } from "./report-pdf-validation-assertions.ts";

const selectedAt = "2026-01-01T00:00:00.000Z";
assertPdfTextEscapesLiteralControls();

const contexts = selectTopRiskReportContexts({
  municipalities: municipalitySchema.array().parse(municipalitiesFixture),
  scans: scanResultSchema.array().parse(enrichedScanFixture),
  source: "fixture",
  selectedAt,
  limit: 2,
});

if (contexts.length !== 2) {
  throw new Error(
    `Expected 2 selected contexts for PDF validation, received ${contexts.length}.`,
  );
}

await runReportPdfValidation({ contexts, selectedAt });

console.log("Report PDF validation passed.");
