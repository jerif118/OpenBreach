import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { generateRemediationReportBatch, reportWorkflow } from "../src/mastra/workflows/report-workflow.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  generateRemediationReportResultSchema,
  municipalitySchema,
  remediationReportSchema,
  remediationReportVariantsSchema,
  reportMetadataSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

const selectedAt = "2026-01-01T00:00:00.000Z";
const contexts = selectTopRiskReportContexts({
  municipalities: municipalitySchema.array().parse(municipalitiesFixture),
  scans: scanResultSchema.array().parse(enrichedScanFixture),
  source: "fixture",
  selectedAt,
  limit: 3,
});

if (contexts.length !== 3) {
  throw new Error(`Expected 3 selected contexts for batch validation, received ${contexts.length}.`);
}

const batch = await generateRemediationReportBatch({
  id: "report-batch-validation",
  contexts,
  generatedAt: selectedAt,
  providerKey: "",
});
const repeatedBatch = await reportWorkflow.runBatch({
  id: "report-batch-validation",
  contexts,
  generatedAt: selectedAt,
  providerKey: "",
});

if (JSON.stringify(batch) !== JSON.stringify(repeatedBatch)) {
  throw new Error("Batch workflow must produce deterministic output for the same fixture inputs.");
}

if (batch.id !== "report-batch-validation") {
  throw new Error("Batch output must preserve the requested batch id.");
}

if (batch.generatedAt !== selectedAt) {
  throw new Error("Batch output must preserve the requested generated timestamp.");
}

if (batch.provider !== "deterministic-fallback") {
  throw new Error(`Expected deterministic fallback provider, received ${batch.provider}.`);
}

if (batch.summary.requested !== contexts.length || batch.summary.completed !== contexts.length || batch.summary.failed !== 0) {
  throw new Error("Batch summary must count requested, completed, and failed records.");
}

if (batch.results.length !== contexts.length) {
  throw new Error("Batch output must include one result per selected context.");
}

batch.results.forEach((result, index) => {
  generateRemediationReportResultSchema.parse(result.result);
  reportMetadataSchema.parse(result.result.metadata);

  if (result.municipalityId !== contexts[index].municipality.id) {
    throw new Error("Batch results must preserve selected context ordering.");
  }

  if (result.rank !== contexts[index].rank) {
    throw new Error("Batch results must preserve selected context ranks.");
  }

  if (result.result.status !== "completed") {
    throw new Error("Expected fixture batch result to complete.");
  }

  remediationReportSchema.parse(result.result.report);
  remediationReportVariantsSchema.parse(result.result.reports);
});

const invalidContext = {
  ...contexts[0],
  scan: {
    ...contexts[0].scan,
    riskScore: 101,
  },
};

const partialBatch = await generateRemediationReportBatch({
  id: "report-batch-partial-failure",
  contexts: [contexts[0], invalidContext],
  generatedAt: selectedAt,
  providerKey: "",
});

if (partialBatch.summary.requested !== 2 || partialBatch.summary.completed !== 1 || partialBatch.summary.failed !== 1) {
  throw new Error("Batch workflow must record partial failures without aborting valid records.");
}

if (partialBatch.results[0].result.status !== "completed" || partialBatch.results[1].result.status !== "failed") {
  throw new Error("Batch workflow must preserve per-record completed and failed statuses.");
}

console.log("Report batch validation passed.");
