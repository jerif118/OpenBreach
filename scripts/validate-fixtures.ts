import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import reportGenerationFixture from "../data/reports/latest.report-generation.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import rawScanEvidenceFixture from "../data/scans/sample-raw-scan-evidence.json" with { type: "json" };
import {
  generateRemediationReportResultSchema,
  municipalitySchema,
  rawScanEvidenceSchema,
  reportGenerationArtifactSchema,
  reportGenerationStatusSchema,
  reportArtifactsSchema,
  reportMetadataSchema,
  reportPdfReferenceSchema,
  remediationReportSchema,
  remediationReportVariantsSchema,
  scanResultSchema,
  selectedMunicipalityReportContextSchema,
} from "../src/shared/contracts.ts";

municipalitySchema.parse(municipalityFixture);
scanResultSchema.parse(scanFixture);
scanResultSchema.array().parse(enrichedScanFixture);
rawScanEvidenceSchema.parse(rawScanEvidenceFixture);
const reportArtifact = reportGenerationArtifactSchema.parse(
  reportGenerationFixture,
);
const firstCompletedReport = reportArtifact.batch.results.find(
  (record) => record.result.status === "completed",
);

if (
  !firstCompletedReport ||
  firstCompletedReport.result.status !== "completed"
) {
  throw new Error("Report generation fixture must include a completed report.");
}

const report = remediationReportSchema.parse(
  firstCompletedReport.result.report,
);

reportGenerationStatusSchema.parse("completed");

const pdfReference = reportPdfReferenceSchema.parse({
  storagePath: "data/reports/mx-yuc-merida-technical.pdf",
  fileName: "mx-yuc-merida-technical.pdf",
  contentType: "application/pdf",
  generatedAt: report.generatedAt,
});

const reportArtifacts = reportArtifactsSchema.parse({
  technical: {
    variant: "technical",
    label: "Technical report PDF",
    pdf: pdfReference,
  },
  friendly: {
    variant: "friendly",
    label: "Friendly report PDF",
    pdf: {
      storagePath: "data/reports/mx-yuc-merida-friendly.pdf",
      fileName: "mx-yuc-merida-friendly.pdf",
      contentType: "application/pdf",
      generatedAt: report.generatedAt,
    },
  },
});

const reportMetadata = reportMetadataSchema.parse({
  reportId: report.id,
  municipalityId: report.municipalityId,
  status: "completed",
  generatedAt: report.generatedAt,
  updatedAt: report.generatedAt,
  pdf: pdfReference,
  artifacts: reportArtifacts,
});

const reportVariants = remediationReportVariantsSchema.parse({
  technical: report,
  friendly: {
    ...report,
    id: "report-friendly-mx-yuc-merida",
    variant: "friendly",
    title: "Friendly Remediation Report for Merida",
  },
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
  reports: reportVariants,
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
  throw new Error(
    "Failed report generation results must include an error message.",
  );
}

console.log("Fixture validation passed.");
