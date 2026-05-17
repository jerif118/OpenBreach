import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  municipalitySchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";
import { runReportPdfValidation } from "./report-pdf-validation-pipeline.ts";
import {
  assertPageTreeReferencesPageObjects,
  assertPdfTextEscapesLiteralControls,
} from "./report-pdf-validation-assertions.ts";

const PDF_VALIDATION_CONTEXT_LIMIT = 2;
const selectedAt = "2026-01-01T00:00:00.000Z";
assertPdfTextEscapesLiteralControls();
assertPageTreeReferencesPageObjects(`
1 0 obj
<< /Type /Catalog /Pages 7 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 7 0 R >>
endobj
7 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
`);

const contexts = selectTopRiskReportContexts({
  municipalities: municipalitySchema.array().parse(municipalitiesFixture),
  scans: scanResultSchema.array().parse(enrichedScanFixture),
  source: "fixture",
  selectedAt,
  limit: PDF_VALIDATION_CONTEXT_LIMIT,
});

if (contexts.length !== PDF_VALIDATION_CONTEXT_LIMIT) {
  throw new Error(
    `Expected ${PDF_VALIDATION_CONTEXT_LIMIT} selected contexts for PDF validation, received ${contexts.length}.`,
  );
}

await runReportPdfValidation({ contexts, selectedAt });

const unsafeCleanupContext = {
  ...contexts[0],
  municipality: {
    ...contexts[0].municipality,
    id: "../Unsafe City/2026",
  },
};
const sentinelPath = "data/Unsafe City/2026-technical.pdf";

await mkdir("data/Unsafe City", { recursive: true });
await writeFile(sentinelPath, "do not delete", "utf8");
await runReportPdfValidation({ contexts: [unsafeCleanupContext], selectedAt });
assert.equal(
  await readFile(sentinelPath, "utf8"),
  "do not delete",
  "PDF cleanup must not remove files outside data/reports through raw municipality IDs.",
);

console.log("Report PDF validation passed.");
