import { chat } from "@tanstack/ai";
import { createOpenaiChat, type OpenAIChatModel } from "@tanstack/ai-openai";
import { remediationReportSchema } from "../shared/contracts.ts";
import type { GenerateRemediationReport, RemediationReport, ScanFinding } from "~/shared";

export type ReportAiProvider = "deterministic-fallback" | "tanstack-ai";

export type ReportAiAdapter = {
  provider: ReportAiProvider;
  generateRemediationReport: GenerateRemediationReport;
};

type ReportAiAdapterProvider = "openai";

type ReportAiChatExecutorInput = {
  model: string;
  messages: Array<{ role: "user"; content: string }>;
  provider: ReportAiAdapterProvider;
  providerKey: string;
  systemPrompts: string[];
};

type ReportAiChatExecutor = (input: ReportAiChatExecutorInput) => Promise<string>;

export type CreateReportAiAdapterOptions = {
  chat?: ReportAiChatExecutor;
  model?: string;
  provider?: ReportAiAdapterProvider;
};

const severityRank: Record<ScanFinding["severity"], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const actionCategoryRank: Partial<Record<ScanFinding["category"], number>> = {
  "known-vulnerability": 3,
  "admin-exposure": 2,
  exposure: 1,
};

function compareFindingsByTechnicianPriority(left: ScanFinding, right: ScanFinding) {
  const severityOrder = severityRank[right.severity] - severityRank[left.severity];

  if (severityOrder !== 0) {
    return severityOrder;
  }

  const categoryOrder =
    (actionCategoryRank[right.category] ?? 0) - (actionCategoryRank[left.category] ?? 0);

  if (categoryOrder !== 0) {
    return categoryOrder;
  }

  return `${left.id}:${left.title}`.localeCompare(`${right.id}:${right.title}`);
}

function buildFallbackSummary({
  municipalityName,
  riskLevel,
  riskScore,
  findingCount,
  topFinding,
}: {
  municipalityName: string;
  riskLevel: string;
  riskScore: number;
  findingCount: number;
  topFinding?: ScanFinding;
}) {
  const focus = topFinding
    ? ` The first technician focus should be: ${topFinding.title}, because the scan evidence is actionable.`
    : " No reportable passive findings were included in this input.";

  return `${municipalityName} currently has a ${riskLevel} risk level with risk score ${riskScore} based on ${findingCount} passive scan findings.${focus} Review the items below as practical remediation guidance, not as a legal or regulatory determination.`;
}

function buildFallbackAction(finding: ScanFinding, index: number) {
  return `Priority ${index + 1}: ${finding.remediationHint} Evidence: ${finding.evidence}`;
}

function getConfiguredProviderKey() {
  return (
    process.env.AI_PROVIDER_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.VITE_AI_PROVIDER_KEY ??
    import.meta.env?.VITE_AI_PROVIDER_KEY
  );
}

function getConfiguredProvider(): ReportAiAdapterProvider {
  return process.env.AI_PROVIDER === "openai" ? "openai" : "openai";
}

function getConfiguredModel() {
  return process.env.AI_PROVIDER_MODEL ?? "gpt-5.2";
}

function buildProviderPrompt({ municipality, scan }: Parameters<GenerateRemediationReport>[0]) {
  return JSON.stringify(
    {
      instructions: [
        "Return only JSON matching the RemediationReport contract.",
        "Use non-alarmist technician language and do not make legal or compliance certification claims.",
        "Preserve evidence-backed findings from the input; do not invent unsupported findings.",
        "Set generatedBy to ai-provider.",
      ],
      outputShape: {
        id: "string",
        municipalityId: municipality.id,
        generatedAt: "ISO datetime string",
        summary: "plain-language technician summary",
        priorityActions: ["prioritized remediation action strings"],
        findings: "array of supplied findings",
        generatedBy: "ai-provider",
      },
      municipality,
      scan,
    },
    null,
    2,
  );
}

function parseProviderReport(content: string): RemediationReport {
  const trimmed = content.trim();
  const json = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)?.[1] ?? trimmed;

  return remediationReportSchema.parse(JSON.parse(json));
}

async function runTanStackChat({
  messages,
  model,
  provider,
  providerKey,
  systemPrompts,
}: ReportAiChatExecutorInput) {
  const adapters: Record<ReportAiAdapterProvider, () => ReturnType<typeof createOpenaiChat>> = {
    openai: () => createOpenaiChat(model as OpenAIChatModel, providerKey),
  };

  return await chat({
    adapter: adapters[provider](),
    messages,
    stream: false,
    systemPrompts,
  });
}

export function createReportAiAdapter(
  providerKey = getConfiguredProviderKey(),
  options: CreateReportAiAdapterOptions = {},
): ReportAiAdapter {
  if (!providerKey) {
    return deterministicReportAdapter;
  }

  const chatExecutor = options.chat ?? runTanStackChat;
  const model = options.model ?? getConfiguredModel();
  const provider = options.provider ?? getConfiguredProvider();

  return {
    provider: "tanstack-ai",
    async generateRemediationReport(input): Promise<RemediationReport> {
      try {
        const content = await chatExecutor({
          model,
          provider,
          providerKey,
          systemPrompts: [
            "You generate concise municipal remediation reports from public passive scan findings.",
            "Return only valid JSON that matches the requested contract.",
          ],
          messages: [
            {
              role: "user",
              content: buildProviderPrompt(input),
            },
          ],
        });

        return parseProviderReport(content);
      } catch {
        return await deterministicReportAdapter.generateRemediationReport(input);
      }
    },
  };
}

export const deterministicReportAdapter: ReportAiAdapter = {
  provider: "deterministic-fallback",
  async generateRemediationReport({ municipality, scan }): Promise<RemediationReport> {
    const prioritizedFindings = [...scan.findings].sort(compareFindingsByTechnicianPriority);

    return {
      id: `report-${scan.id}`,
      municipalityId: municipality.id,
      generatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      summary: buildFallbackSummary({
        municipalityName: municipality.name,
        riskLevel: scan.riskLevel,
        riskScore: scan.riskScore,
        findingCount: scan.findings.length,
        topFinding: prioritizedFindings[0],
      }),
      priorityActions: prioritizedFindings.slice(0, 5).map(buildFallbackAction),
      findings: prioritizedFindings,
      generatedBy: "deterministic-fallback",
    };
  },
};
