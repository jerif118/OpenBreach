import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";

import { renderBatchPdfArtifacts } from "../src/mastra/workflows/report-pdf-rendering.ts";
import {
  renderReportBatchPdfs,
  type GenerateRemediationReportBatchOutput,
  type GenerateRemediationReportBatchRecord,
} from "../src/mastra/workflows/report-workflow.ts";
import {
  reportPdfReferenceSchema,
  type SelectedMunicipalityReportContext,
} from "../src/shared/contracts.ts";
import { assertPageTreeReferencesPageObjects } from "./report-pdf-validation-assertions.ts";
import { requiredElement } from "./report-pdf-validation-helpers.ts";

function assertPdfIncludes(
  pdfContent: string,
  snippets: readonly string[],
  messagePrefix: string,
): void {
  for (const snippet of snippets) {
    if (!pdfContent.includes(snippet)) {
      throw new Error(`${messagePrefix}: ${snippet}`);
    }
  }
}

async function assertRenderedRecordContent(
  record: GenerateRemediationReportBatchRecord,
  contexts: SelectedMunicipalityReportContext[],
): Promise<void> {
  if (record.result.status !== "completed") {
    throw new Error("Fixture PDF batch records must be completed.");
  }

  const pdf = reportPdfReferenceSchema.parse(record.result.metadata.pdf);
  const artifacts = record.result.metadata.artifacts;

  if (pdf.fileName !== `${record.municipalityId}-technical.pdf`) {
    throw new Error("Technical PDF filenames must be based on municipality IDs.");
  }

  if (!artifacts?.technical || !artifacts.friendly) {
    throw new Error(
      "Rendered report metadata must include both technical and friendly artifacts.",
    );
  }

  const technicalArtifactPdf = reportPdfReferenceSchema.parse(
    artifacts.technical.pdf,
  );
  const friendlyArtifactPdf = reportPdfReferenceSchema.parse(
    artifacts.friendly.pdf,
  );

  const technicalPdfContent = await readFile(
    technicalArtifactPdf.storagePath,
    "latin1",
  );
  const friendlyPdfContent = await readFile(
    friendlyArtifactPdf.storagePath,
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

  const firstFinding = requiredElement(
    context.scan.findings,
    0,
    `Selected context ${context.municipality.id} must include a finding for PDF validation.`,
  );

  assertPdfIncludes(
    technicalPdfContent,
    [
      context.municipality.name,
      "Technical Remediation Report",
      "Audience: Technical",
      "Executive summary",
      "Priority actions",
      firstFinding.title,
      `Severity: ${firstFinding.severity}`,
    ],
    "Generated PDF is missing expected content",
  );
  assertPdfIncludes(
    friendlyPdfContent,
    [
      context.municipality.name,
      "Friendly Remediation Report",
      "Quick summary",
    ],
    "Friendly PDF is missing expected content",
  );
}

export async function assertRenderedResults(
  output: GenerateRemediationReportBatchOutput,
  contexts: SelectedMunicipalityReportContext[],
): Promise<void> {
  for (const record of output.results) {
    await assertRenderedRecordContent(record, contexts);
  }
}

export async function assertArtifactFailureGuards(
  output: GenerateRemediationReportBatchOutput,
  contexts: SelectedMunicipalityReportContext[],
  firstContext: SelectedMunicipalityReportContext,
): Promise<void> {
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
            ...firstContext,
            scan: {
              ...firstContext.scan,
              riskScore: 101,
            },
          },
          ...contexts.slice(1),
        ],
      }),
    /Invalid selected report context/,
  );
}

export async function assertUnsafeFilenameValidation(
  firstContext: SelectedMunicipalityReportContext,
  selectedAt: string,
): Promise<void> {
  const unsafeOutput = await renderReportBatchPdfs({
    contexts: [
      {
        ...firstContext,
        municipality: {
          ...firstContext.municipality,
          id: "../Unsafe City/2026",
        },
      },
    ],
    batchId: "report-pdf-unsafe-name-validation",
    generatedAt: selectedAt,
    providerKey: "",
  });

  const unsafeRecord = requiredElement(
    unsafeOutput.results,
    0,
    "Unsafe filename validation record must complete.",
  );

  if (unsafeRecord.result.status !== "completed") {
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
}
