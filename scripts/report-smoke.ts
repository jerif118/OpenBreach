import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { createReportAiAdapter } from "../src/ai/report-adapter.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  generateRemediationReportResultSchema,
  municipalitySchema,
  remediationReportSchema,
  remediationReportVariantsSchema,
  reportMetadataSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

const [context] = selectTopRiskReportContexts({
  municipalities: municipalitySchema.array().parse(municipalitiesFixture),
  scans: scanResultSchema.array().parse(enrichedScanFixture),
  source: "fixture",
  selectedAt: "2026-01-01T00:00:00.000Z",
  limit: 1,
});

if (!context) {
  throw new Error("Expected at least one reportable fixture context.");
}

const { municipality, scan } = context;
const adapter = createReportAiAdapter("");

if (adapter.provider !== "deterministic-fallback") {
  throw new Error(
    `Expected deterministic fallback without credentials, received ${adapter.provider}.`,
  );
}

const reports = await adapter.generateRemediationReportVariants({
  municipality,
  scan,
  generatedAt: "2026-01-01T00:00:00.000Z",
});
const repeatedReports = await adapter.generateRemediationReportVariants({
  municipality,
  scan,
  generatedAt: "2026-01-01T00:00:00.000Z",
});

const report = reports.technical;

if (JSON.stringify(reports) !== JSON.stringify(repeatedReports)) {
  throw new Error(
    "Deterministic fallback must return identical report JSON for the same input.",
  );
}

remediationReportVariantsSchema.parse(reports);
remediationReportSchema.parse(report);
const metadata = reportMetadataSchema.parse({
  reportId: report.id,
  municipalityId: report.municipalityId,
  status: "completed",
  generatedAt: report.generatedAt,
  updatedAt: report.generatedAt,
});

generateRemediationReportResultSchema.parse({
  status: "completed",
  report,
  reports,
  metadata,
});

if (!report.summary.includes(municipality.name)) {
  throw new Error("Report summary must name the municipality.");
}

if (
  !report.summary.includes(`${scan.riskScore}`) ||
  !report.summary.includes(scan.riskLevel)
) {
  throw new Error(
    "Report summary must include risk score and risk level context.",
  );
}

if (report.priorityActions.length === 0 || report.priorityActions.length > 5) {
  throw new Error(
    "Fallback report must include one to five prioritized actions.",
  );
}

report.priorityActions.forEach((action, index) => {
  if (!action.startsWith(`Priority ${index + 1}:`)) {
    throw new Error(
      "Fallback actions must be clearly prioritized for technicians.",
    );
  }

  if (!action.includes("Verification:")) {
    throw new Error(
      "Fallback actions must connect remediation steps to verification guidance.",
    );
  }
});

const blockedLanguage =
  /breach|guarantee|certif(?:y|ies|ied|ication)|compliant|noncompliant/i;

if (
  blockedLanguage.test(report.summary) ||
  report.priorityActions.some((action) => blockedLanguage.test(action))
) {
  throw new Error(
    "Fallback report language must avoid alarmist or compliance-certification claims.",
  );
}

for (const finding of report.findings) {
  if (
    !finding.evidence ||
    !finding.remediationHint ||
    finding.remediationSteps.length === 0 ||
    finding.verificationSteps.length === 0
  ) {
    throw new Error(
      "Fallback report findings must preserve evidence and remediation hints.",
    );
  }
}

if (reports.friendly.variant !== "friendly") {
  throw new Error(
    "Friendly report variant must be generated alongside the technical report.",
  );
}

console.log(JSON.stringify(reports, null, 2));
