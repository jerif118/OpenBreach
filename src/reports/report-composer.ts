import {
  remediationReportSchema,
  remediationReportVariantsSchema,
  type RemediationReport,
  type RemediationReportVariants,
  type ReportAudience,
  type ReportFinding,
} from "../shared/contracts.ts";
import {
  summarizeFindingsBySeverity,
  type NormalizedReportInput,
} from "./report-normalizer.ts";

const plainLanguageDictionary: Array<[RegExp, string]> = [
  [/\bHTTP Strict Transport Security\b/gi, "browser rule that forces secure connections"],
  [/\bContent Security Policy\b/gi, "browser rule that limits what the site can load"],
  [/\bX-Content-Type-Options\b/gi, "browser setting that blocks unsafe file-type guessing"],
  [/\bTLS\b/gi, "secure website certificate setup"],
  [/\bSSL\b/gi, "secure website certificate setup"],
  [/\bHSTS\b/gi, "forced secure browsing rule"],
  [/\bCSP\b/gi, "page loading safety rule"],
  [/\bCMS\b/gi, "website management software"],
  [/\badmin exposure\b/gi, "administrator page visible on the internet"],
  [/\bknown vulnerability\b/gi, "known security weakness"],
  [/\bvulnerability\b/gi, "security weakness"],
  [/\bpassive scan\b/gi, "safe public review"],
  [/\bpassive\b/gi, "safe public"],
  [/\bremediation\b/gi, "fix"],
  [/\bexploitability\b/gi, "how easily the issue could be misused"],
  [/\bcertificate\b/gi, "security certificate"],
];

function toSentence(value: string) {
  const normalized = value.replace(/\s{2,}/g, " ").trim();

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function translatePlainLanguage(value: string) {
  let translated = value;

  for (const [pattern, replacement] of plainLanguageDictionary) {
    translated = translated.replace(pattern, replacement);
  }

  return translated;
}

function buildReportId(subjectId: string, variant: ReportAudience) {
  return `report-${variant}-${subjectId}`;
}

function buildReportTitle(subjectName: string, variant: ReportAudience) {
  return variant === "technical"
    ? `Technical Remediation Report for ${subjectName}`
    : `Friendly Remediation Report for ${subjectName}`;
}

function toAudienceText(value: string, variant: ReportAudience) {
  return variant === "friendly" ? translatePlainLanguage(value) : value;
}

function adaptFinding(finding: ReportFinding, variant: ReportAudience): ReportFinding {
  if (variant === "technical") {
    return finding;
  }

  return {
    ...finding,
    title: toAudienceText(finding.title, variant),
    description: toSentence(toAudienceText(finding.description, variant)),
    evidence: toSentence(toAudienceText(finding.evidence, variant)),
    evidenceSummary: toSentence(toAudienceText(finding.evidenceSummary, variant)),
    remediationHint: toSentence(toAudienceText(finding.remediationHint, variant)),
    remediationSteps: finding.remediationSteps.map((step) => toSentence(toAudienceText(step, variant))),
    verificationSteps: finding.verificationSteps.map((step) => toSentence(toAudienceText(step, variant))),
  };
}

function buildPriorityActions(input: NormalizedReportInput, variant: ReportAudience) {
  const actions = input.findings.length
    ? input.findings.slice(0, 5).map((finding, index) => {
        if (variant === "technical") {
          return `Priority ${index + 1}: ${finding.remediationHint} Verification: ${finding.verificationSteps[0]}`;
        }

        return `Priority ${index + 1}: ${toAudienceText(finding.remediationHint, variant)} Why it matters: ${toAudienceText(finding.evidenceSummary, variant)}`;
      })
    : input.remediationChecklist.slice(0, 5);

  return actions.map((action) => toSentence(action));
}

function buildSummary(input: NormalizedReportInput, variant: ReportAudience) {
  if (variant === "technical") {
    return toSentence(
      `${input.subject.name} is currently assessed at ${input.riskLevel} risk with score ${input.riskScore}/100 based on ${input.findings.length} normalized reportable finding(s). This technical report preserves uncertainty, distinguishes evidence from inference, and orders remediation work by severity, evidence clarity, and verification readiness`,
    );
  }

  return toSentence(
    translatePlainLanguage(
      `${input.subject.name} shows a ${input.riskLevel} level of risk with score ${input.riskScore}/100 based on ${input.findings.length} main issue(s). This version explains the situation in simpler language, keeps the uncertainty visible, and highlights the most important next actions first`,
    ),
  );
}

function buildFindingsOverview(input: NormalizedReportInput, variant: ReportAudience) {
  const severitySummary = summarizeFindingsBySeverity(input.findings);
  const topTitles = input.findings.slice(0, 3).map((finding) => finding.title);
  const bullets = [
    ...severitySummary,
    ...topTitles.map((title) =>
      variant === "friendly" ? `Top issue: ${translatePlainLanguage(title)}` : `Top finding: ${title}`,
    ),
  ];

  if (variant === "technical") {
    return {
      title: "Findings overview",
      narrative: toSentence(
        `The ordered finding set below reflects the normalized evidence currently available for ${input.subject.name}. Items with stronger evidence and higher severity appear first`,
      ),
      bullets: bullets.length > 0 ? bullets : ["No reportable findings were supplied in the current input payload."],
    };
  }

  return {
    title: "What needs attention",
    narrative: toSentence(
      translatePlainLanguage(
        `These are the main issues that deserve attention first. The list is ordered by likely impact and by how clear the available evidence is`,
      ),
    ),
    bullets: bullets.length > 0 ? bullets.map((entry) => translatePlainLanguage(entry)) : [
      "No clear issue list was supplied in the current input payload.",
    ],
  };
}

function buildSectionNarrative(title: string, narrative: string, variant: ReportAudience) {
  if (variant === "technical") {
    return { title, narrative: toSentence(narrative) };
  }

  return {
    title,
    narrative: toSentence(translatePlainLanguage(narrative)),
  };
}

function buildReport(input: NormalizedReportInput, variant: ReportAudience, generatedBy: RemediationReport["generatedBy"], generatedAt: string): RemediationReport {
  const findings = input.findings.map((finding) => adaptFinding(finding, variant));
  const findingsOverview = buildFindingsOverview(input, variant);
  const scopeTitle = variant === "technical" ? "Scope" : "What this report covers";
  const authorizationTitle = variant === "technical" ? "Authorization" : "What was allowed";
  const methodologyTitle = variant === "technical" ? "Methodology" : "How this was reviewed";
  const skippedTitle = variant === "technical" ? "Skipped and denied tests" : "What was not tested";
  const validationTitle = variant === "technical" ? "Validation status" : "What was confirmed";
  const limitationsTitle = variant === "technical" ? "Limitations" : "Important limits";
  const remediationTitle = variant === "technical" ? "Remediation checklist" : "Recommended next actions";
  const verificationTitle = variant === "technical" ? "Verification guidance" : "How to check the fixes";

  return remediationReportSchema.parse({
    id: buildReportId(input.subject.id, variant),
    municipalityId: input.subject.id,
    variant,
    generatedAt,
    title: buildReportTitle(input.subject.name, variant),
    summary: buildSummary(input, variant),
    priorityActions: buildPriorityActions(input, variant),
    findings,
    sections: {
      scope: {
        ...buildSectionNarrative(scopeTitle, input.scopeNarrative, variant),
        bullets: input.scopeBullets.map((bullet) => toAudienceText(bullet, variant)),
      },
      authorization: {
        ...buildSectionNarrative(authorizationTitle, input.authorizationNarrative, variant),
        bullets: input.authorizationBullets.map((bullet) => toAudienceText(bullet, variant)),
      },
      methodology: {
        ...buildSectionNarrative(methodologyTitle, input.methodologyNarrative, variant),
        bullets: input.methodologyBullets.map((bullet) => toAudienceText(bullet, variant)),
      },
      findingsOverview: {
        title: findingsOverview.title,
        narrative: findingsOverview.narrative,
        bullets: findingsOverview.bullets,
      },
      skippedTests: {
        ...buildSectionNarrative(skippedTitle, variant === "technical"
          ? "These activities were skipped, denied, or intentionally excluded from the current report scope"
          : "The current material does not cover every possible check, and the following activities were intentionally left out or not supplied",
        variant),
        bullets: input.skippedTests.map((bullet) => toAudienceText(bullet, variant)),
      },
      validationStatus: {
        ...buildSectionNarrative(validationTitle, variant === "technical"
          ? "The following notes summarize the provided validation state and observed status information"
          : "These notes explain what the current evidence does and does not confirm",
        variant),
        bullets: input.validationStatus.map((bullet) => toAudienceText(bullet, variant)),
      },
      limitations: {
        ...buildSectionNarrative(limitationsTitle, variant === "technical"
          ? "The report remains bounded by the supplied evidence, missing fields, and explicit safety constraints"
          : "These limits matter because they explain what still needs human follow-up before making a final decision",
        variant),
        bullets: input.limitations.map((bullet) => toAudienceText(bullet, variant)),
      },
      remediationChecklist: {
        ...buildSectionNarrative(remediationTitle, variant === "technical"
          ? "Use this checklist to coordinate the next engineering actions and their owners"
          : "These are the clearest next steps to reduce the risk in a practical way",
        variant),
        bullets: input.remediationChecklist.map((bullet) => toAudienceText(bullet, variant)),
      },
      verificationGuidance: {
        ...buildSectionNarrative(verificationTitle, variant === "technical"
          ? "After mitigation, repeat only the same bounded checks and compare the new evidence against this report"
          : "After each fix, use a simple follow-up review to confirm the public signs improved",
        variant),
        bullets: input.verificationGuidance.map((bullet) => toAudienceText(bullet, variant)),
      },
    },
    generatedBy,
  });
}

export function buildDeterministicReportVariants(
  input: NormalizedReportInput,
  generatedBy: RemediationReport["generatedBy"],
  generatedAt = input.generatedAt,
): RemediationReportVariants {
  return remediationReportVariantsSchema.parse({
    technical: buildReport(input, "technical", generatedBy, generatedAt),
    friendly: buildReport(input, "friendly", generatedBy, generatedAt),
  });
}
