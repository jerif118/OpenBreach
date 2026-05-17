import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { plainLanguageReportAgent } from "../mastra/agents/plain-language-report-agent.ts";
import { reportAgent } from "../mastra/agents/report-agent.ts";
import { buildDeterministicReportVariants } from "../reports/report-composer.ts";
import { normalizeReportInput } from "../reports/report-normalizer.ts";
import { parseProviderReport } from "./report-provider-parser.ts";
import { buildProviderPrompt } from "./report-provider-prompt.ts";
import {
  remediationReportVariantsSchema,
  type GenerateRemediationReport,
  type GenerateRemediationReportInput,
  type GenerateRemediationReportVariants,
  type ReportAudience,
  type RemediationReport,
  type RemediationReportVariants,
} from "../shared/contracts.ts";

export type ReportAiProvider = "deterministic-fallback" | "tanstack-ai";

export type ReportAiAdapter = {
  provider: ReportAiProvider;
  generateRemediationReport: GenerateRemediationReport;
  generateRemediationReportVariants: GenerateRemediationReportVariants;
};

type ReportAiAdapterProvider = "openrouter";

const DEFAULT_ADAPTER_PROVIDER: ReportAiAdapterProvider = "openrouter";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const DETERMINISTIC_PROVIDER = "deterministic-fallback";
const TANSTACK_PROVIDER = "tanstack-ai";
const JSON_CONTRACT_SYSTEM_PROMPT =
  "Return only valid JSON that matches the requested contract.";

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

function getConfiguredProviderKey(): string | undefined {
  const viteProviderKey = import.meta.env?.VITE_AI_PROVIDER_KEY;

  return (
    process.env.AI_PROVIDER_KEY ??
    process.env.OPENROUTER_API_KEY ??
    process.env.VITE_AI_PROVIDER_KEY ??
    (typeof viteProviderKey === "string" ? viteProviderKey : undefined)
  );
}

function getConfiguredProvider(): ReportAiAdapterProvider {
  return DEFAULT_ADAPTER_PROVIDER;
}

function getConfiguredModel(): string {
  return process.env.AI_PROVIDER_MODEL ?? DEFAULT_MODEL;
}

async function runTanStackChat({
  messages,
  model,
  provider,
  providerKey,
  systemPrompts,
}: ReportAiChatExecutorInput): Promise<string> {
  const adapters: Record<
    ReportAiAdapterProvider,
    () => ReturnType<typeof createOpenRouterText>
  > = {
    openrouter: () => {
      const openRouterModel = model as Parameters<
        typeof createOpenRouterText
      >[0];

      return createOpenRouterText(openRouterModel, providerKey);
    },
  };

  return await chat({
    adapter: adapters[provider](),
    messages,
    stream: false,
    systemPrompts,
  });
}

async function generateProviderReport({
  chatExecutor,
  input,
  model,
  provider,
  providerKey,
  variant,
}: {
  chatExecutor: ReportAiChatExecutor;
  input: GenerateRemediationReportInput;
  model: string;
  provider: ReportAiAdapterProvider;
  providerKey: string;
  variant: ReportAudience;
}): Promise<RemediationReport> {
  const content = await chatExecutor({
    model,
    provider,
    providerKey,
    systemPrompts: [
      variant === "technical"
        ? reportAgent.instructions
        : plainLanguageReportAgent.instructions,
      JSON_CONTRACT_SYSTEM_PROMPT,
    ],
    messages: [
      {
        role: "user",
        content: buildProviderPrompt(input, variant),
      },
    ],
  });

  return parseProviderReport(content, variant);
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
}): Promise<RemediationReportVariants> {
  const technical = await generateProviderReport({
    chatExecutor,
    input,
    model,
    provider,
    providerKey,
    variant: "technical",
  });
  const friendly = await generateProviderReport({
    chatExecutor,
    input,
    model,
    provider,
    providerKey,
    variant: "friendly",
  });

  return remediationReportVariantsSchema.parse({
    technical,
    friendly,
  });
}

export function createReportAiAdapter(
  providerKey = getConfiguredProviderKey(),
  options: CreateReportAiAdapterOptions = {},
): ReportAiAdapter {
  const deterministicReportAdapter: ReportAiAdapter = {
    provider: DETERMINISTIC_PROVIDER,
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
        DETERMINISTIC_PROVIDER,
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
  const generateRemediationReportVariants = async (
    input: GenerateRemediationReportInput,
  ): Promise<RemediationReportVariants> => {
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
  };

  return {
    provider: TANSTACK_PROVIDER,
    async generateRemediationReport(input): Promise<RemediationReport> {
      return (await generateRemediationReportVariants(input)).technical;
    },
    generateRemediationReportVariants,
  };
}
