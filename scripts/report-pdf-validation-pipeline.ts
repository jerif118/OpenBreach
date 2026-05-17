import { readFile, rm } from "node:fs/promises";

import {
  renderReportBatchPdfs,
  type GenerateRemediationReportBatchOutput,
} from "../src/mastra/workflows/report-workflow.ts";
import type { SelectedMunicipalityReportContext } from "../src/shared/contracts.ts";
import {
  assertArtifactFailureGuards,
  assertRenderedResults,
  assertUnsafeFilenameValidation,
} from "./report-pdf-validation-checks.ts";
import { requiredElement } from "./report-pdf-validation-helpers.ts";

type ReportPdfValidationInput = {
  contexts: SelectedMunicipalityReportContext[];
  selectedAt: string;
};

async function assertTemplateDocumentation(): Promise<void> {
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
}

async function removeExistingReportPdfs(
  contexts: SelectedMunicipalityReportContext[],
): Promise<void> {
  for (const context of contexts) {
    await rm(`data/reports/${context.municipality.id}-technical.pdf`, {
      force: true,
    });
    await rm(`data/reports/${context.municipality.id}-friendly.pdf`, {
      force: true,
    });
  }
}

async function renderFixtureBatch(
  contexts: SelectedMunicipalityReportContext[],
  selectedAt: string,
): Promise<GenerateRemediationReportBatchOutput> {
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

  return output;
}

async function assertStorageDocumentation(): Promise<void> {
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
}

export async function runReportPdfValidation({
  contexts,
  selectedAt,
}: ReportPdfValidationInput): Promise<void> {
  const firstContext = requiredElement(
    contexts,
    0,
    "Expected at least one selected context for PDF validation.",
  );

  await assertTemplateDocumentation();
  await removeExistingReportPdfs(contexts);

  const output = await renderFixtureBatch(contexts, selectedAt);

  await assertRenderedResults(output, contexts);
  await assertArtifactFailureGuards(output, contexts, firstContext);
  await assertUnsafeFilenameValidation(firstContext, selectedAt);
  await assertStorageDocumentation();
}
