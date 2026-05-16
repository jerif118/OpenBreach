import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import reportFixture from "../data/reports/sample-report.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import rawScanEvidenceFixture from "../data/scans/sample-raw-scan-evidence.json" with { type: "json" };
import {
  generateRemediationReportResultSchema,
  municipalitySchema,
  rawScanEvidenceSchema,
  reportGenerationStatusSchema,
  reportMetadataSchema,
  reportPdfReferenceSchema,
  remediationReportSchema,
  scanResultSchema,
  selectedMunicipalityReportContextSchema,
} from "../src/shared/contracts.ts";

municipalitySchema.parse(municipalityFixture);
scanResultSchema.parse(scanFixture);
scanResultSchema.array().parse(enrichedScanFixture);
rawScanEvidenceSchema.parse(rawScanEvidenceFixture);
const report = remediationReportSchema.parse(reportFixture);

reportGenerationStatusSchema.parse("completed");

const pdfReference = reportPdfReferenceSchema.parse({
  storagePath: "data/reports/mx-yuc-merida.pdf",
  fileName: "mx-yuc-merida.pdf",
  contentType: "application/pdf",
  generatedAt: report.generatedAt,
});

const reportMetadata = reportMetadataSchema.parse({
  reportId: report.id,
  municipalityId: report.municipalityId,
  status: "completed",
  generatedAt: report.generatedAt,
  updatedAt: report.generatedAt,
  pdf: pdfReference,
});

selectedMunicipalityReportContextSchema.parse({
  municipality: municipalityFixture,
  scan: scanFixture,
  source: "fixture",
  selectedAt: report.generatedAt,
});

generateRemediationReportResultSchema.parse({
  status: "completed",
  report,
  metadata: reportMetadata,
});

const unsafePdf = reportPdfReferenceSchema.safeParse({
  storagePath: "../mx-yuc-merida.pdf",
  fileName: "mx-yuc-merida.pdf",
});

if (unsafePdf.success) {
  throw new Error("Unsafe report PDF paths must be rejected.");
}

const failedWithoutError = generateRemediationReportResultSchema.safeParse({
  status: "failed",
  metadata: { ...reportMetadata, status: "failed" },
});

if (failedWithoutError.success) {
  throw new Error("Failed report generation results must include an error message.");
}

console.log("Fixture validation passed.");
