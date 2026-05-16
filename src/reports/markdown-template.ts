import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { RemediationReport } from "../shared/contracts.ts";

const TEMPLATE_DIRECTORY = join(process.cwd(), "src", "reports", "templates");

const templateFileByVariant = {
  technical: "technical-report.md",
  friendly: "friendly-report.md",
} as const satisfies Record<RemediationReport["variant"], string>;

type TemplateContext = Record<string, string>;

function normalizeMarkdownValue(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function toBulletsMarkdown(items: string[]) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- No additional items were supplied for this section.";
}

function toOrderedMarkdown(items: string[]) {
  return items.length > 0
    ? items.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "1. No priority actions were supplied.";
}

function buildDetailedFindingsMarkdown(report: RemediationReport) {
  if (report.findings.length === 0) {
    return "No structured findings were supplied in the current input.";
  }

  return report.findings
    .map((finding, index) =>
      [
        `### ${index + 1}. ${finding.title}`,
        `- Severity: ${finding.severity}`,
        `- Status: ${finding.status}`,
        `- Confidence: ${finding.confidence}`,
        `- Category: ${finding.category}`,
        finding.affectedAssets.length > 0
          ? `- Affected assets: ${finding.affectedAssets.join(", ")}`
          : null,
        "",
        `**Description**`,
        finding.description,
        "",
        `**Evidence**`,
        finding.evidenceSummary,
        "",
        `**Recommended remediation**`,
        finding.remediationHint,
        "",
        `**Remediation steps**`,
        ...finding.remediationSteps.map((step) => `- ${step}`),
        "",
        `**Verification steps**`,
        ...finding.verificationSteps.map((step) => `- ${step}`),
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    )
    .join("\n\n");
}

function buildTemplateContext({
  municipalityName,
  report,
}: {
  municipalityName: string;
  report: RemediationReport;
}): TemplateContext {
  return {
    title: report.title,
    summary: report.summary,
    municipalityName,
    municipalityId: report.municipalityId,
    audienceLabel:
      report.variant === "technical" ? "Technical" : "Friendly / nontechnical",
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    priorityActionsMarkdown: toOrderedMarkdown(report.priorityActions),
    scopeNarrative: report.sections.scope.narrative,
    scopeBulletsMarkdown: toBulletsMarkdown(report.sections.scope.bullets),
    authorizationNarrative: report.sections.authorization.narrative,
    authorizationBulletsMarkdown: toBulletsMarkdown(
      report.sections.authorization.bullets,
    ),
    methodologyNarrative: report.sections.methodology.narrative,
    methodologyBulletsMarkdown: toBulletsMarkdown(
      report.sections.methodology.bullets,
    ),
    findingsOverviewNarrative: report.sections.findingsOverview.narrative,
    findingsOverviewBulletsMarkdown: toBulletsMarkdown(
      report.sections.findingsOverview.bullets,
    ),
    skippedTestsNarrative: report.sections.skippedTests.narrative,
    skippedTestsBulletsMarkdown: toBulletsMarkdown(
      report.sections.skippedTests.bullets,
    ),
    validationStatusNarrative: report.sections.validationStatus.narrative,
    validationStatusBulletsMarkdown: toBulletsMarkdown(
      report.sections.validationStatus.bullets,
    ),
    limitationsNarrative: report.sections.limitations.narrative,
    limitationsBulletsMarkdown: toBulletsMarkdown(
      report.sections.limitations.bullets,
    ),
    remediationChecklistNarrative:
      report.sections.remediationChecklist.narrative,
    remediationChecklistBulletsMarkdown: toBulletsMarkdown(
      report.sections.remediationChecklist.bullets,
    ),
    verificationGuidanceNarrative:
      report.sections.verificationGuidance.narrative,
    verificationGuidanceBulletsMarkdown: toBulletsMarkdown(
      report.sections.verificationGuidance.bullets,
    ),
    detailedFindingsMarkdown: buildDetailedFindingsMarkdown(report),
  };
}

function renderTemplate(template: string, context: TemplateContext) {
  let output = template;

  for (const [key, value] of Object.entries(context)) {
    output = output.replaceAll(`{{${key}}}`, normalizeMarkdownValue(value));
  }

  return output;
}

export async function renderReportMarkdown({
  municipalityName,
  report,
}: {
  municipalityName: string;
  report: RemediationReport;
}) {
  const templatePath = join(
    TEMPLATE_DIRECTORY,
    templateFileByVariant[report.variant],
  );
  const template = await readFile(templatePath, "utf8");
  return renderTemplate(
    template,
    buildTemplateContext({ municipalityName, report }),
  );
}
