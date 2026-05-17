import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import pivotWorkflowFixture from "../data/pivot/sample-pivot-workflow.json" with { type: "json" };
import reportGenerationFixture from "../data/reports/latest.report-generation.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import rawScanEvidenceFixture from "../data/scans/sample-raw-scan-evidence.json" with { type: "json" };
import {
  approvalGateSchema,
  auditEventSchema,
  authorizationScopeSchema,
  evidenceEnvelopeSchema,
  findingSchema,
  generateRemediationReportResultSchema,
  municipalitySchema,
  passiveScanEvidenceSchema,
  rawScanEvidenceSchema,
  reportArtifactSchema,
  reportGenerationArtifactSchema,
  reportGenerationStatusSchema,
  reportArtifactsSchema,
  reportMetadataSchema,
  reportPdfReferenceSchema,
  remediationReportSchema,
  remediationReportVariantsSchema,
  scanResultSchema,
  selectedMunicipalityReportContextSchema,
  targetProfileSchema,
  technologyFingerprintSchema,
  testPlanSchema,
  validationResultSchema,
  vulnerabilityHypothesisSchema,
  workflowRunSchema,
  type GenerateRemediationReportBatchRecord,
  type GenerateRemediationReportResult,
} from "../src/shared/contracts.ts";

type CompletedReportRecord = GenerateRemediationReportBatchRecord & {
  result: Extract<GenerateRemediationReportResult, { status: "completed" }>;
};

function isCompletedReportRecord(
  record: GenerateRemediationReportBatchRecord,
): record is CompletedReportRecord {
  return record.result.status === "completed";
}

municipalitySchema.parse(municipalityFixture);
scanResultSchema.parse(scanFixture);
scanResultSchema.array().parse(enrichedScanFixture);
rawScanEvidenceSchema.parse(rawScanEvidenceFixture);
targetProfileSchema.parse(pivotWorkflowFixture.approvedTarget);
targetProfileSchema.parse(pivotWorkflowFixture.rejectedTarget);
authorizationScopeSchema.parse(pivotWorkflowFixture.authorizationScope);
workflowRunSchema.parse(pivotWorkflowFixture.workflowRun);
passiveScanEvidenceSchema.parse(pivotWorkflowFixture.passiveEvidence);
technologyFingerprintSchema.parse(pivotWorkflowFixture.technologyFingerprint);
vulnerabilityHypothesisSchema.parse(
  pivotWorkflowFixture.vulnerabilityHypothesis,
);
testPlanSchema.parse(pivotWorkflowFixture.testPlan);
approvalGateSchema.parse(pivotWorkflowFixture.approvalGate);
validationResultSchema.parse(pivotWorkflowFixture.validationResult);
evidenceEnvelopeSchema.parse(pivotWorkflowFixture.evidenceEnvelope);
findingSchema.parse(pivotWorkflowFixture.finding);
reportArtifactSchema.parse(pivotWorkflowFixture.reportArtifact);
auditEventSchema.parse(pivotWorkflowFixture.auditEvent);
const reportArtifact = reportGenerationArtifactSchema.parse(
  reportGenerationFixture,
);
const firstCompletedReport = reportArtifact.batch.results.find(
  isCompletedReportRecord,
);

if (!firstCompletedReport) {
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
