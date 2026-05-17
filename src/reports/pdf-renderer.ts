import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  createReportPdfFileTarget,
  createReportPdfReference,
} from "./pdf-file-reference.ts";
import { buildStyledPdfDocument } from "./pdf-layout.ts";
import { renderReportMarkdown } from "./markdown-template.ts";
import {
  reportArtifactReferenceSchema,
  reportArtifactsSchema,
  type RemediationReport,
  type RemediationReportVariants,
  type ReportArtifacts,
  type ReportPdfReference,
} from "../shared/contracts.ts";

export type RenderReportPdfInput = {
  municipalityName: string;
  report: RemediationReport;
  generatedAt: string;
  outputDirectory?: string;
};

export type RenderReportArtifactsInput = {
  municipalityName: string;
  reports: RemediationReportVariants;
  generatedAt: string;
  outputDirectory?: string;
};

export type RenderReportArtifactsResult = {
  pdf: ReportPdfReference;
  artifacts: ReportArtifacts;
};

const DEFAULT_OUTPUT_DIRECTORY = "data/reports";

export async function renderReportPdf({
  municipalityName,
  report,
  generatedAt,
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
}: RenderReportPdfInput): Promise<ReportPdfReference> {
  const markdown = await renderReportMarkdown({ municipalityName, report });
  const pdfBytes = await buildStyledPdfDocument(markdown, report.variant);
  const { fileName, storagePath } = createReportPdfFileTarget({
    report,
    outputDirectory,
  });

  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(storagePath, pdfBytes);

  const { size } = await stat(storagePath);
  return createReportPdfReference({
    fileName,
    storagePath,
    generatedAt,
    sizeBytes: size,
  });
}

export async function renderReportArtifacts({
  municipalityName,
  reports,
  generatedAt,
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
}: RenderReportArtifactsInput): Promise<RenderReportArtifactsResult> {
  const technicalPdf = await renderReportPdf({
    municipalityName,
    report: reports.technical,
    generatedAt,
    outputDirectory,
  });
  const friendlyPdf = await renderReportPdf({
    municipalityName,
    report: reports.friendly,
    generatedAt,
    outputDirectory,
  });

  const artifacts = reportArtifactsSchema.parse({
    technical: reportArtifactReferenceSchema.parse({
      variant: "technical",
      label: "Technical report PDF",
      pdf: technicalPdf,
    }),
    friendly: reportArtifactReferenceSchema.parse({
      variant: "friendly",
      label: "Friendly report PDF",
      pdf: friendlyPdf,
    }),
  });

  return { pdf: technicalPdf, artifacts };
}
