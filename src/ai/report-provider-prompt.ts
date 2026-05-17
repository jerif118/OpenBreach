import { normalizeReportInput } from "../reports/report-normalizer.ts";
import type {
  GenerateRemediationReportInput,
  ReportAudience,
} from "../shared/contracts.ts";

export function buildProviderPrompt(
  input: GenerateRemediationReportInput,
  variant: ReportAudience,
): string {
  const normalized = normalizeReportInput(input);

  return JSON.stringify(
    {
      instructions: [
        "Return only JSON matching the RemediationReport contract.",
        "Do not invent new findings, evidence, validation outcomes, or scope details.",
        "Use only the structured normalized input provided below.",
        "Avoid exploit steps, payloads, raw secrets, or compliance-certification claims.",
        "Set generatedBy to ai-provider.",
        `Render the ${variant} report variant and keep the variant field exactly "${variant}".`,
      ],
      audience:
        variant === "technical"
          ? "Formal, engineer-ready, detailed, ordered, and evidence-grounded."
          : "Plain-language, accessible to nontechnical owners, and free of unnecessary jargon.",
      outputShape: {
        id: "string",
        municipalityId: normalized.subject.id,
        variant,
        generatedAt: normalized.generatedAt,
        title: "string",
        summary: "string",
        priorityActions: ["string"],
        findings: "array matching the supplied normalized finding shape",
        sections: {
          scope: { title: "string", narrative: "string", bullets: ["string"] },
          authorization: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          methodology: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          findingsOverview: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          skippedTests: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          validationStatus: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          limitations: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          remediationChecklist: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
          verificationGuidance: {
            title: "string",
            narrative: "string",
            bullets: ["string"],
          },
        },
        generatedBy: "ai-provider",
      },
      normalizedInput: normalized,
    },
    null,
    2,
  );
}
