import fs from "fs";
import path from "path";
import { z } from "zod";
import municipalityFixture from "../data/municipalities/sample-municipality.json" with { type: "json" };
import reportGenerationFixture from "../data/reports/latest.report-generation.json" with { type: "json" };
import scanFixture from "../data/scans/sample-scan.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import rawScanEvidenceFixture from "../data/scans/sample-raw-scan-evidence.json" with { type: "json" };
import {
  approvalGateSchema,
  findingSchema,
  generateRemediationReportResultSchema,
  municipalitySchema,
  passiveScanEvidenceSchema,
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
  type GenerateRemediationReportBatchRecord,
  type GenerateRemediationReportResult,
  targetProfileSchema,
  validationResultSchema,
  vulnerabilityHypothesisSchema,
  workflowRunSchema,
} from "../src/shared/contracts.ts";

type CompletedReportRecord = GenerateRemediationReportBatchRecord & {
  result: Extract<GenerateRemediationReportResult, { status: "completed" }>;
};

function isCompletedReportRecord(
  record: GenerateRemediationReportBatchRecord,
): record is CompletedReportRecord {
  return record.result.status === "completed";
}


// ============================================================
// Legacy fixture pipeline (hard-coded imports)
// ============================================================

municipalitySchema.parse(municipalityFixture);
scanResultSchema.parse(scanFixture);
scanResultSchema.array().parse(enrichedScanFixture);
rawScanEvidenceSchema.parse(rawScanEvidenceFixture);
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

// ============================================================
// Generic target fixture pipeline (dynamic discovery)
// ============================================================

const targetsDir = "data/targets";
const targetFiles = fs
  .readdirSync(targetsDir)
  .filter((f) => f.endsWith(".json"));

const knownTargetIds = new Set<string>();
const errors: string[] = [];

function formatZodIssues(
  filePath: string,
  contractName: string,
  err: unknown,
): string[] {
  if (err instanceof z.ZodError) {
    return err.issues.map(
      (issue) =>
        `[FAIL] ${filePath} → ${contractName} → ${issue.path.join(".") || "root"}: ${issue.message}`,
    );
  }
  return [`[FAIL] ${filePath} → ${contractName} → ${String(err)}`];
}

// --- First pass: schema validation + collect targetIds ---
for (const file of targetFiles) {
  const filePath = path.join(targetsDir, file);
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (file.startsWith("target-")) {
    try {
      targetProfileSchema.parse(content);
      knownTargetIds.add(content.targetId);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "TargetProfile", e));
    }
  } else if (file === "rejected-target.json") {
    try {
      targetProfileSchema.parse(content.targetProfile);
      knownTargetIds.add(content.targetProfile.targetId);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "TargetProfile", e));
    }
    try {
      approvalGateSchema.parse(content.approvalGate);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "ApprovalGate", e));
    }
    try {
      workflowRunSchema.parse(content.workflowRun);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "WorkflowRun", e));
    }
  } else if (file.startsWith("passive-evidence-")) {
    try {
      passiveScanEvidenceSchema.parse(content);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "PassiveScanEvidence", e));
    }
  } else if (file.startsWith("vulnerability-")) {
    try {
      vulnerabilityHypothesisSchema.parse(content);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "VulnerabilityHypothesis", e));
    }
  } else if (file.startsWith("approval-")) {
    try {
      approvalGateSchema.parse(content);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "ApprovalGate", e));
    }
  } else if (file.startsWith("validation-")) {
    try {
      validationResultSchema.parse(content);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "ValidationResult", e));
    }
  } else if (file.startsWith("report-ready-")) {
    try {
      findingSchema.parse(content);
    } catch (e) {
      errors.push(...formatZodIssues(filePath, "Finding", e));
    }
  } else {
    errors.push(
      `[FAIL] ${filePath} → Router → unknown fixture filename prefix`,
    );
  }
}

// --- Second pass: cross-reference integrity ---
for (const file of targetFiles) {
  const filePath = path.join(targetsDir, file);
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (file === "rejected-target.json") {
    if (content.approvalGate?.targetId !== content.targetProfile?.targetId) {
      errors.push(
        `[FAIL] ${filePath} → CrossRef → approvalGate.targetId does not match targetProfile.targetId`,
      );
    }
    if (content.workflowRun?.targetId !== content.targetProfile?.targetId) {
      errors.push(
        `[FAIL] ${filePath} → CrossRef → workflowRun.targetId does not match targetProfile.targetId`,
      );
    }
  } else if (!file.startsWith("target-")) {
    const targetId = content.targetId;
    if (targetId && !knownTargetIds.has(targetId)) {
      errors.push(
        `[FAIL] ${filePath} → CrossRef → targetId '${targetId}' not found in target set`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log("Fixture validation passed.");
