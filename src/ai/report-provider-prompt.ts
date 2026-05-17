import {
  normalizeReportInput,
  type NormalizedReportInput,
} from "../reports/report-normalizer.ts";
import type {
  GenerateRemediationReportInput,
  ReportAudience,
  RemediationReport,
} from "../shared/contracts.ts";

type PromptReportSectionKey = keyof RemediationReport["sections"];

type PromptReportSectionShape = {
  title: "string";
  narrative: "string";
  bullets: ["string"];
};

type PromptOutputShape = {
  id: "string";
  municipalityId: NormalizedReportInput["subject"]["id"];
  variant: ReportAudience;
  generatedAt: NormalizedReportInput["generatedAt"];
  title: "string";
  summary: "string";
  priorityActions: ["string"];
  findings: "array matching the supplied normalized finding shape";
  sections: Record<PromptReportSectionKey, PromptReportSectionShape>;
  generatedBy: "ai-provider";
};

function buildPromptInstructions(variant: ReportAudience): string[] {
  return [
    "Return only JSON matching the RemediationReport contract.",
    "Do not invent new findings, evidence, validation outcomes, or scope details.",
    "Use only the structured normalized input provided below.",
    "Avoid exploit steps, payloads, raw secrets, or compliance-certification claims.",
    "Set generatedBy to ai-provider.",
    `Render the ${variant} report variant and keep the variant field exactly "${variant}".`,
  ];
}

function getAudienceDescription(variant: ReportAudience): string {
  return variant === "technical"
    ? "Formal, engineer-ready, detailed, ordered, and evidence-grounded."
    : "Plain-language, accessible to nontechnical owners, and free of unnecessary jargon.";
}

function buildReportSectionShape(): PromptReportSectionShape {
  return { title: "string", narrative: "string", bullets: ["string"] };
}

function buildOutputShape(
  normalized: NormalizedReportInput,
  variant: ReportAudience,
): PromptOutputShape {
  return {
    id: "string",
    municipalityId: normalized.subject.id,
    variant,
    generatedAt: normalized.generatedAt,
    title: "string",
    summary: "string",
    priorityActions: ["string"],
    findings: "array matching the supplied normalized finding shape",
    sections: {
      scope: buildReportSectionShape(),
      authorization: buildReportSectionShape(),
      methodology: buildReportSectionShape(),
      findingsOverview: buildReportSectionShape(),
      skippedTests: buildReportSectionShape(),
      validationStatus: buildReportSectionShape(),
      limitations: buildReportSectionShape(),
      remediationChecklist: buildReportSectionShape(),
      verificationGuidance: buildReportSectionShape(),
    },
    generatedBy: "ai-provider",
  };
}

export function buildProviderPrompt(
  input: GenerateRemediationReportInput,
  variant: ReportAudience,
): string {
  const normalized = normalizeReportInput(input);

  return JSON.stringify(
    {
      instructions: buildPromptInstructions(variant),
      audience: getAudienceDescription(variant),
      outputShape: buildOutputShape(normalized, variant),
      normalizedInput: normalized,
    },
    null,
    2,
  );
}
