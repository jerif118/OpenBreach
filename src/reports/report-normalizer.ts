import {
  generateRemediationReportInputSchema,
  type ReportFinding,
  type RiskLevel,
} from "../shared/contracts.ts";
import { collectFindingCandidates } from "./report-finding-normalizer.ts";
import {
  looseSourcePayload,
  pickString,
  severityLabels,
  uniqueStrings,
} from "./report-normalizer-utils.ts";
import {
  deriveAuthorizationSection,
  deriveLimitations,
  deriveMethodologySection,
  deriveScopeSection,
  deriveSkippedTests,
  deriveValidationStatus,
} from "./report-section-normalizer.ts";
import {
  deriveRiskLevel,
  deriveRiskScore,
  deriveSubject,
  type NormalizedSubject,
} from "./report-subject-risk.ts";

export type NormalizedReportInput = {
  generatedAt: string;
  subject: NormalizedSubject;
  riskScore: number;
  riskLevel: RiskLevel;
  findings: ReportFinding[];
  scopeNarrative: string;
  scopeBullets: string[];
  authorizationNarrative: string;
  authorizationBullets: string[];
  methodologyNarrative: string;
  methodologyBullets: string[];
  skippedTests: string[];
  validationStatus: string[];
  limitations: string[];
  remediationChecklist: string[];
  verificationGuidance: string[];
  sourceData: unknown;
};

function deriveRemediationChecklist(findings: ReportFinding[]): string[] {
  const checklist = findings.flatMap((finding) => [
    ...finding.remediationSteps,
    `Confirm ownership for ${finding.title.toLowerCase()} before the next review cycle.`,
  ]);

  return uniqueStrings(
    checklist.length > 0
      ? checklist
      : [
          "Review the normalized input with the responsible team and define the next bounded remediation step.",
        ],
  ).slice(0, 10);
}

function deriveVerificationGuidance(findings: ReportFinding[]): string[] {
  const guidance = findings.flatMap((finding) => finding.verificationSteps);

  return uniqueStrings(
    guidance.length > 0
      ? guidance
      : [
          "After the next change, repeat the same bounded observation path and compare the result with this report.",
        ],
  ).slice(0, 10);
}

export function normalizeReportInput(
  rawInput: unknown,
): NormalizedReportInput {
  const input = generateRemediationReportInputSchema.parse(rawInput);
  const findings = collectFindingCandidates(input);
  const riskScore = deriveRiskScore(findings, input);
  const riskLevel = deriveRiskLevel(riskScore, findings, input);
  const subject = deriveSubject(input);
  const scope = deriveScopeSection(subject, input);
  const authorization = deriveAuthorizationSection(input);
  const methodology = deriveMethodologySection(input);

  return {
    generatedAt:
      input.generatedAt ??
      pickString(looseSourcePayload(input), ["generatedAt"]) ??
      new Date("2026-01-01T00:00:00.000Z").toISOString(),
    subject,
    riskScore,
    riskLevel,
    findings,
    scopeNarrative: scope.narrative,
    scopeBullets: scope.bullets,
    authorizationNarrative: authorization.narrative,
    authorizationBullets: authorization.bullets,
    methodologyNarrative: methodology.narrative,
    methodologyBullets: methodology.bullets,
    skippedTests: deriveSkippedTests(input),
    validationStatus: deriveValidationStatus(input),
    limitations: deriveLimitations(input, findings),
    remediationChecklist: deriveRemediationChecklist(findings),
    verificationGuidance: deriveVerificationGuidance(findings),
    sourceData: input.sourceData ?? rawInput,
  };
}

export function summarizeFindingsBySeverity(
  findings: ReportFinding[],
): string[] {
  return severityLabels
    .map((severity) => {
      const count = findings.filter(
        (finding) => finding.severity === severity,
      ).length;
      return count > 0 ? `${severity}: ${count}` : null;
    })
    .filter((entry): entry is string => entry !== null);
}
