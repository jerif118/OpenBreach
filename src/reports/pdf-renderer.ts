import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  reportPdfReferenceSchema,
  type RemediationReport,
  type ReportPdfReference,
  type ScanResult,
} from "../shared/contracts.ts";

export type RenderReportPdfInput = {
  municipalityName: string;
  report: RemediationReport;
  scan: ScanResult;
  generatedAt: string;
  outputDirectory?: string;
};

const DEFAULT_OUTPUT_DIRECTORY = "data/reports";

function sanitizePdfFileStem(value: string) {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
  return sanitized || "municipality-report";
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function normalizePdfText(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function buildPdfTextLines({ municipalityName, report, scan }: RenderReportPdfInput) {
  const lines = [
    `Remediation Report: ${municipalityName}`,
    `Municipality ID: ${report.municipalityId}`,
    `Risk score: ${scan.riskScore}`,
    `Risk level: ${scan.riskLevel}`,
    `Generated at: ${report.generatedAt}`,
    "Summary:",
    report.summary,
    "Priority actions:",
    ...report.priorityActions,
    "Evidence and remediation:",
    ...report.findings.flatMap((finding) => [
      `${finding.severity.toUpperCase()}: ${finding.title}`,
      `Evidence: ${finding.evidence}`,
      `Remediation: ${finding.remediationHint}`,
    ]),
  ];

  return lines.map(normalizePdfText).filter(Boolean);
}

function buildPdfDocument(lines: string) {
  const objects: string[] = [];
  const content = ["BT", "/F1 11 Tf", "50 760 Td"];

  for (const [index, line] of lines.split("\n").entries()) {
    if (index > 0) {
      content.push("0 -16 Td");
    }

    content.push(`(${escapePdfText(line)}) Tj`);
  }

  content.push("ET");

  const stream = content.join("\n");

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);

  let body = "%PDF-1.4\n";
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return body;
}

export async function renderReportPdf({
  municipalityName,
  report,
  scan,
  generatedAt,
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
}: RenderReportPdfInput): Promise<ReportPdfReference> {
  const fileName = `${sanitizePdfFileStem(report.municipalityId)}.pdf`;
  const storagePath = join(outputDirectory, fileName).replace(/\\/g, "/");
  const lines = buildPdfTextLines({ municipalityName, report, scan, generatedAt, outputDirectory });
  const pdf = buildPdfDocument(lines.join("\n"));

  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(storagePath, pdf, "latin1");

  const { size } = await stat(storagePath);

  return reportPdfReferenceSchema.parse({
    storagePath,
    fileName,
    contentType: "application/pdf",
    generatedAt,
    sizeBytes: size,
  });
}
