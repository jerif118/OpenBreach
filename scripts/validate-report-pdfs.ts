import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";

import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { renderBatchPdfArtifacts } from "../src/mastra/workflows/report-pdf-rendering.ts";
import { renderReportBatchPdfs } from "../src/mastra/workflows/report-workflow.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  municipalitySchema,
  reportPdfReferenceSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";
import {
  assertPageTreeReferencesPageObjects,
  assertPdfTextEscapesLiteralControls,
} from "./report-pdf-validation-assertions.ts";

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

for (const templatePath of [
  "src/reports/templates/technical-report.md",
  "src/reports/templates/friendly-report.md",
  "src/reports/templates/README.md",
]) {
  const templateSource = await readFile(templatePath, "utf8");

  if (
    templatePath.endsWith(".md") &&
    !templatePath.endsWith("README.md") &&
    !templateSource.includes("{{title}}")
  ) {
    throw new Error(
      `Report template is missing required placeholders: ${templatePath}`,
    );
  }

  if (
    templatePath.endsWith("README.md") &&
    !templateSource.includes("technical-report.md")
  ) {
    throw new Error(
      "Report template README must document the editable template files.",
    );
  }
}

for (const context of contexts) {
  await rm(`data/reports/${context.municipality.id}-technical.pdf`, {
    force: true,
  });
  await rm(`data/reports/${context.municipality.id}-friendly.pdf`, {
    force: true,
  });
}

const output = await renderReportBatchPdfs({
  contexts,
  batchId: "report-pdf-validation",
  generatedAt: selectedAt,
  providerKey: "",
});

if (
  output.summary.completed !== contexts.length ||
  output.summary.failed !== 0
) {
  throw new Error(
    "PDF validation batch must complete all selected fixture reports.",
  );
}

if (output.results.length !== contexts.length) {
  throw new Error(
    "PDF validation batch must preserve one result per selected context.",
  );
}

for (const record of output.results) {
  if (record.result.status !== "completed") {
    throw new Error("Fixture PDF batch records must be completed.");
  }

  const pdf = reportPdfReferenceSchema.parse(record.result.metadata.pdf);
  const artifacts = record.result.metadata.artifacts;

  if (pdf.fileName !== `${record.municipalityId}-technical.pdf`) {
    throw new Error(
      "Technical PDF filenames must be based on municipality IDs.",
    );
  }

  if (!artifacts?.technical || !artifacts.friendly) {
    throw new Error(
      "Rendered report metadata must include both technical and friendly artifacts.",
    );
  }

  const technicalPdfContent = await readFile(pdf.storagePath, "latin1");
  const friendlyPdfContent = await readFile(
    artifacts.friendly.pdf.storagePath,
    "latin1",
  );

  assertPageTreeReferencesPageObjects(technicalPdfContent);
  assertPageTreeReferencesPageObjects(friendlyPdfContent);

  const context = contexts.find(
    (candidate) => candidate.municipality.id === record.municipalityId,
  );

  if (!context) {
    throw new Error(`Missing selected context for ${record.municipalityId}.`);
  }

  const requiredSnippets = [
    context.municipality.name,
    "Technical Remediation Report",
    "Audience: Technical",
    "Executive summary",
    "Priority actions",
    context.scan.findings[0]?.title,
    `Severity: ${context.scan.findings[0]?.severity}`,
  ].filter((snippet): snippet is string => Boolean(snippet));

  for (const snippet of requiredSnippets) {
    if (!technicalPdfContent.includes(snippet)) {
      throw new Error(`Generated PDF is missing expected content: ${snippet}`);
    }
  }

  for (const snippet of [
    context.municipality.name,
    "Friendly Remediation Report",
    "Quick summary",
  ]) {
    if (!friendlyPdfContent.includes(snippet)) {
      throw new Error(`Friendly PDF is missing expected content: ${snippet}`);
    }
  }
}

await assert.rejects(
  () => renderBatchPdfArtifacts({ batch: output, contexts: contexts.slice(1) }),
  /Missing selected report context/,
);

await assert.rejects(
  () =>
    renderBatchPdfArtifacts({
      batch: output,
      contexts: [
        {
          ...contexts[0],
          scan: {
            ...contexts[0].scan,
            riskScore: 101,
          },
        },
        ...contexts.slice(1),
      ],
    }),
  /Invalid selected report context/,
);

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

const unsafePdf = reportPdfReferenceSchema.parse(
  unsafeRecord.result.metadata.pdf,
);

if (unsafePdf.fileName !== "Unsafe_City_2026-technical.pdf") {
  throw new Error(
    `Expected sanitized unsafe filename, received ${unsafePdf.fileName}.`,
  );
}

await rm(unsafePdf.storagePath, { force: true });
await rm("data/reports/Unsafe_City_2026-friendly.pdf", { force: true });

const storageDoc = (
  await readFile("docs/report-mvp-storage.md", "utf8")
).toLowerCase();

if (
  !storageDoc.includes("data/reports/") ||
  !storageDoc.includes("/reports/$filename")
) {
  throw new Error(
    "MVP storage documentation must describe the local path and the route used to serve report downloads.",
  );
}

console.log("Report PDF validation passed.");
