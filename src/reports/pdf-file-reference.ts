import { join } from "node:path";

import {
  reportPdfReferenceSchema,
  type RemediationReport,
} from "../shared/contracts.ts";

function sanitizePdfFileStem(value: string) {
  const sanitized = value
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
  return sanitized || "municipality-report";
}

export function createReportPdfFileTarget({
  report,
  outputDirectory,
}: {
  report: RemediationReport;
  outputDirectory: string;
}) {
  const fileName = `${sanitizePdfFileStem(report.municipalityId)}-${report.variant}.pdf`;
  const storagePath = join(outputDirectory, fileName).replace(/\\/g, "/");

  return { fileName, storagePath };
}

export function createReportPdfReference({
  fileName,
  storagePath,
  generatedAt,
  sizeBytes,
}: {
  fileName: string;
  storagePath: string;
  generatedAt: string;
  sizeBytes: number;
}) {
  return reportPdfReferenceSchema.parse({
    storagePath,
    fileName,
    contentType: "application/pdf",
    generatedAt,
    sizeBytes,
  });
}
