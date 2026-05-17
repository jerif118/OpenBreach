import { plainLanguageReportAgent } from "../mastra/agents/plain-language-report-agent.ts";
import { reportAgent } from "../mastra/agents/report-agent.ts";
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

type ProviderBoundFinding = Omit<
  NormalizedReportInput["findings"][number],
  "raw"
>;

type ProviderBoundNormalizedInput = Omit<
  NormalizedReportInput,
  "findings" | "sourceData"
> & {
  findings: ProviderBoundFinding[];
};

const PROMPT_REPORT_SECTION_ORDER = [
  "scope",
  "authorization",
  "methodology",
  "findingsOverview",
  "skippedTests",
  "validationStatus",
  "limitations",
  "remediationChecklist",
  "verificationGuidance",
] as const satisfies readonly PromptReportSectionKey[];

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

type AudienceProfile = {
  description: string;
  instructions: string;
};

function audienceProfile(variant: ReportAudience): AudienceProfile {
  if (variant === "technical") {
    return {
      description:
        "Formal, engineer-ready, detailed, ordered, and evidence-grounded.",
      instructions: reportAgent.instructions,
    };
  }

  return {
    description:
      "Plain-language, accessible to nontechnical owners, and free of unnecessary jargon.",
    instructions: plainLanguageReportAgent.instructions,
  };
}

/** Mastra system instructions aligned with {@link buildProviderPrompt}'s variant. */
export function getReportProviderAudienceInstructions(
  variant: ReportAudience,
): string {
  return audienceProfile(variant).instructions;
}

function buildReportSectionShape(): PromptReportSectionShape {
  return { title: "string", narrative: "string", bullets: ["string"] };
}

function buildReportSections(): Record<
  PromptReportSectionKey,
  PromptReportSectionShape
> {
  return Object.fromEntries(
    PROMPT_REPORT_SECTION_ORDER.map((sectionKey) => [
      sectionKey,
      buildReportSectionShape(),
    ]),
  ) as Record<PromptReportSectionKey, PromptReportSectionShape>;
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
    sections: buildReportSections(),
    generatedBy: "ai-provider",
  };
}

function buildProviderBoundInput(
  normalized: NormalizedReportInput,
): ProviderBoundNormalizedInput {
  const { findings, sourceData: _sourceData, ...safeInput } = normalized;

  return {
    ...safeInput,
    findings: findings.map(({ raw: _raw, ...finding }) => finding),
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
      audience: audienceProfile(variant).description,
      outputShape: buildOutputShape(normalized, variant),
      normalizedInput: buildProviderBoundInput(normalized),
    },
    null,
    2,
  );
}
