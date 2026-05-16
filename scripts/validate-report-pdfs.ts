import { readFile, rm } from "node:fs/promises";

import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { renderReportBatchPdfs } from "../src/mastra/workflows/report-workflow.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  municipalitySchema,
  reportPdfReferenceSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

const selectedAt = "2026-01-01T00:00:00.000Z";
const contexts = selectTopRiskReportContexts({
  municipalities: municipalitySchema.array().parse(municipalitiesFixture),
  scans: scanResultSchema.array().parse(enrichedScanFixture),
  source: "fixture",
  selectedAt,
  limit: 2,
});

if (contexts.length !== 2) {
  throw new Error(`Expected 2 selected contexts for PDF validation, received ${contexts.length}.`);
}

for (const context of contexts) {
  await rm(`data/reports/${context.municipality.id}.pdf`, { force: true });
}

const output = await renderReportBatchPdfs({
  contexts,
  batchId: "report-pdf-validation",
  generatedAt: selectedAt,
  providerKey: "",
});

if (output.summary.completed !== contexts.length || output.summary.failed !== 0) {
  throw new Error("PDF validation batch must complete all selected fixture reports.");
}

if (output.results.length !== contexts.length) {
  throw new Error("PDF validation batch must preserve one result per selected context.");
}

for (const record of output.results) {
  if (record.result.status !== "completed") {
    throw new Error("Fixture PDF batch records must be completed.");
  }

  const pdf = reportPdfReferenceSchema.parse(record.result.metadata.pdf);

  if (pdf.fileName !== `${record.municipalityId}.pdf`) {
    throw new Error("PDF filenames must be based on municipality IDs.");
  }

  const pdfContent = await readFile(pdf.storagePath, "latin1");
  const context = contexts.find((candidate) => candidate.municipality.id === record.municipalityId);

  if (!context) {
    throw new Error(`Missing selected context for ${record.municipalityId}.`);
  }

  const requiredSnippets = [
    context.municipality.name,
    `Risk score: ${context.scan.riskScore}`,
    record.result.report.summary,
    record.result.report.priorityActions[0],
    context.scan.findings[0]?.evidence,
    context.scan.findings[0]?.remediationHint,
  ].filter((snippet): snippet is string => Boolean(snippet));

  for (const snippet of requiredSnippets) {
    if (!pdfContent.includes(snippet)) {
      throw new Error(`Generated PDF is missing expected content: ${snippet}`);
    }
  }
}

const unsafeOutput = await renderReportBatchPdfs({
  contexts: [
    {
      ...contexts[0],
      municipality: {
        ...contexts[0].municipality,
        id: "../Unsafe City/2026",
      },
    },
  ],
  batchId: "report-pdf-unsafe-name-validation",
  generatedAt: selectedAt,
  providerKey: "",
});

const [unsafeRecord] = unsafeOutput.results;

if (!unsafeRecord || unsafeRecord.result.status !== "completed") {
  throw new Error("Unsafe filename validation record must complete.");
}

const unsafePdf = reportPdfReferenceSchema.parse(unsafeRecord.result.metadata.pdf);

if (unsafePdf.fileName !== "Unsafe_City_2026.pdf") {
  throw new Error(`Expected sanitized unsafe filename, received ${unsafePdf.fileName}.`);
}

await rm(unsafePdf.storagePath, { force: true });

const storageDoc = (await readFile("docs/report-mvp-storage.md", "utf8")).toLowerCase();

if (!storageDoc.includes("data/reports/") || !storageDoc.includes("public serving is deferred")) {
  throw new Error("MVP storage documentation must describe the local path and deferred public serving assumption.");
}

console.log("Report PDF validation passed.");
