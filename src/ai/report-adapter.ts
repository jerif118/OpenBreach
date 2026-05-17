import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { plainLanguageReportAgent } from "../mastra/agents/plain-language-report-agent.ts";
import { reportAgent } from "../mastra/agents/report-agent.ts";
import { buildDeterministicReportVariants } from "../reports/report-composer.ts";
import { normalizeReportInput } from "../reports/report-normalizer.ts";
import { buildProviderPrompt } from "./report-provider-prompt.ts";
import {
  remediationReportSchema,
  remediationReportVariantsSchema,
  type GenerateRemediationReport,
  type GenerateRemediationReportInput,
  type GenerateRemediationReportVariants,
  type RemediationReport,
  type RemediationReportVariants,
  type ReportAudience,
} from "../shared/contracts.ts";

export type ReportAiProvider = "deterministic-fallback" | "tanstack-ai";

export type ReportAiAdapter = {
  provider: ReportAiProvider;
  generateRemediationReport: GenerateRemediationReport;
  generateRemediationReportVariants: GenerateRemediationReportVariants;
};

type ReportAiAdapterProvider = "openrouter";

type ReportAiChatExecutorInput = {
  model: string;
  messages: Array<{ role: "user"; content: string }>;
  provider: ReportAiAdapterProvider;
  providerKey: string;
  systemPrompts: string[];
};

type ReportAiChatExecutor = (
  input: ReportAiChatExecutorInput,
) => Promise<string>;

export type CreateReportAiAdapterOptions = {
  chat?: ReportAiChatExecutor;
  model?: string;
  provider?: ReportAiAdapterProvider;
};

function getConfiguredProviderKey() {
  return (
    process.env.AI_PROVIDER_KEY ??
    process.env.OPENROUTER_API_KEY ??
    process.env.VITE_AI_PROVIDER_KEY ??
    import.meta.env?.VITE_AI_PROVIDER_KEY
  );
}

function getConfiguredProvider(): ReportAiAdapterProvider {
  return process.env.AI_PROVIDER === "openrouter" ? "openrouter" : "openrouter";
}

function getConfiguredModel() {
  return process.env.AI_PROVIDER_MODEL ?? "anthropic/claude-sonnet-4";
}

function parseProviderReport(content: string): RemediationReport {
  const trimmed = content.trim();
  const json =
    trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)?.[1] ?? trimmed;

  return remediationReportSchema.parse(JSON.parse(json));
}

async function runTanStackChat({
  messages,
  model,
  provider,
  providerKey,
  systemPrompts,
}: ReportAiChatExecutorInput) {
  const adapters: Record<
    ReportAiAdapterProvider,
    () => ReturnType<typeof createOpenRouterText>
  > = {
    openrouter: () =>
      createOpenRouterText(
        model as Parameters<typeof createOpenRouterText>[0],
        providerKey,
      ),
  };

  return await chat({
    adapter: adapters[provider](),
    messages,
    stream: false,
    systemPrompts,
  });
}

async function generateProviderBackedVariants({
  chatExecutor,
  input,
  model,
  provider,
  providerKey,
}: {
  chatExecutor: ReportAiChatExecutor;
  input: GenerateRemediationReportInput;
  model: string;
  provider: ReportAiAdapterProvider;
  providerKey: string;
}) {
  const results: Partial<Record<ReportAudience, RemediationReport>> = {};

  for (const variant of ["technical", "friendly"] as const) {
    const content = await chatExecutor({
      model,
      provider,
      providerKey,
      systemPrompts: [
        variant === "technical"
          ? reportAgent.instructions
          : plainLanguageReportAgent.instructions,
        "Return only valid JSON that matches the requested contract.",
      ],
      messages: [
        {
          role: "user",
          content: buildProviderPrompt(input, variant),
        },
      ],
    });

    results[variant] = parseProviderReport(content);
  }

  return remediationReportVariantsSchema.parse({
    technical: results.technical,
    friendly: results.friendly,
  });
}

export function createReportAiAdapter(
  providerKey = getConfiguredProviderKey(),
  options: CreateReportAiAdapterOptions = {},
): ReportAiAdapter {
  const deterministicReportAdapter: ReportAiAdapter = {
    provider: "deterministic-fallback",
    async generateRemediationReport(input): Promise<RemediationReport> {
      return (
        await deterministicReportAdapter.generateRemediationReportVariants(
          input,
        )
      ).technical;
    },
    async generateRemediationReportVariants(
      input,
    ): Promise<RemediationReportVariants> {
      const normalized = normalizeReportInput(input);
      return buildDeterministicReportVariants(
        normalized,
        "deterministic-fallback",
        normalized.generatedAt,
      );
    },
  };

  if (!providerKey) {
    return deterministicReportAdapter;
  }

  const chatExecutor = options.chat ?? runTanStackChat;
  const model = options.model ?? getConfiguredModel();
  const provider = options.provider ?? getConfiguredProvider();

  return {
    provider: "tanstack-ai",
    async generateRemediationReport(input): Promise<RemediationReport> {
      return (await this.generateRemediationReportVariants(input)).technical;
    },
    async generateRemediationReportVariants(
      input,
    ): Promise<RemediationReportVariants> {
      try {
        return await generateProviderBackedVariants({
          chatExecutor,
          input,
          model,
          provider,
          providerKey,
        });
      } catch {
        return await deterministicReportAdapter.generateRemediationReportVariants(
          input,
        );
      }
    },
  };
}
