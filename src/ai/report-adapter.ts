import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { buildDeterministicReportVariants } from "../reports/report-composer.ts";
import { normalizeReportInput } from "../reports/report-normalizer.ts";
import { parseProviderReport } from "./report-provider-parser.ts";
import {
  buildProviderPrompt,
  getReportProviderAudienceInstructions,
} from "./report-provider-prompt.ts";
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
type OpenRouterModel = Parameters<typeof createOpenRouterText>[0];
type OpenRouterAdapter = ReturnType<typeof createOpenRouterText>;
type ReportAiChatMessage = {
  role: "user";
  content: string;
};

const DEFAULT_ADAPTER_PROVIDER: ReportAiAdapterProvider = "openrouter";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const DETERMINISTIC_PROVIDER = "deterministic-fallback";
const TANSTACK_PROVIDER = "tanstack-ai";
const JSON_CONTRACT_SYSTEM_PROMPT =
  "Return only valid JSON that matches the requested contract.";

type ReportAiChatExecutorInput = {
  model: string;
  messages: ReportAiChatMessage[];
  provider: ReportAiAdapterProvider;
  providerKey: string;
  systemPrompts: string[];
};

type ReportAiChatExecutor = (
  input: ReportAiChatExecutorInput,
) => Promise<string>;

type ProviderRuntime = {
  chatExecutor: ReportAiChatExecutor;
  model: string;
  provider: ReportAiAdapterProvider;
  providerKey: string;
};

type GenerateProviderReportOptions = {
  input: GenerateRemediationReportInput;
  runtime: ProviderRuntime;
  variant: ReportAudience;
};

type GenerateProviderBackedVariantsOptions = {
  input: GenerateRemediationReportInput;
  runtime: ProviderRuntime;
};

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

function toOpenRouterModel(model: string): OpenRouterModel {
  return model as OpenRouterModel;
}

async function generateDeterministicReportVariants(
  input: GenerateRemediationReportInput,
): Promise<RemediationReportVariants> {
  const normalized = normalizeReportInput(input);
  return buildDeterministicReportVariants(
    normalized,
    DETERMINISTIC_PROVIDER,
    normalized.generatedAt,
  );
}

function createDeterministicReportAdapter(): ReportAiAdapter {
  return {
    provider: DETERMINISTIC_PROVIDER,
    async generateRemediationReport(input): Promise<RemediationReport> {
      return (await generateDeterministicReportVariants(input)).technical;
    },
    generateRemediationReportVariants: generateDeterministicReportVariants,
  };
}

function remediationProviderContractSystemPrompts(
  variant: ReportAudience,
): string[] {
  return [
    getReportProviderAudienceInstructions(variant),
    JSON_CONTRACT_SYSTEM_PROMPT,
  ];
}

async function runTanStackChat({
  messages,
  model,
  provider,
  providerKey,
  systemPrompts,
}: ReportAiChatExecutorInput): Promise<string> {
  const adapters: Record<ReportAiAdapterProvider, () => OpenRouterAdapter> = {
    openrouter: () =>
      createOpenRouterText(toOpenRouterModel(model), providerKey),
  };

  return await chat({
    adapter: adapters[provider](),
    messages,
    stream: false,
    systemPrompts,
  });
}

async function generateProviderReport({
  input,
  runtime,
  variant,
}: GenerateProviderReportOptions): Promise<RemediationReport> {
  const { chatExecutor, model, provider, providerKey } = runtime;

  const content = await chatExecutor({
    model,
    provider,
    providerKey,
    systemPrompts: remediationProviderContractSystemPrompts(variant),
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
  input,
  runtime,
}: GenerateProviderBackedVariantsOptions): Promise<RemediationReportVariants> {
  const technical = await generateProviderReport({
    input,
    runtime,
    variant: "technical",
  });
  const friendly = await generateProviderReport({
    input,
    runtime,
    variant: "friendly",
  });

  return remediationReportVariantsSchema.parse({
    technical,
    friendly,
  });
}

function createProviderRuntime(
  providerKey: string,
  options: CreateReportAiAdapterOptions,
): ProviderRuntime {
  return {
    chatExecutor: options.chat ?? runTanStackChat,
    model: options.model ?? getConfiguredModel(),
    provider: options.provider ?? getConfiguredProvider(),
    providerKey,
  };
}

function createProviderBackedReportAdapter(
  providerKey: string,
  options: CreateReportAiAdapterOptions,
  fallbackAdapter: ReportAiAdapter,
): ReportAiAdapter {
  const runtime = createProviderRuntime(providerKey, options);
  const generateRemediationReportVariants = async (
    input: GenerateRemediationReportInput,
  ): Promise<RemediationReportVariants> => {
    try {
      return await generateProviderBackedVariants({ input, runtime });
    } catch {
      return await fallbackAdapter.generateRemediationReportVariants(input);
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

export function createReportAiAdapter(
  providerKey = getConfiguredProviderKey(),
  options: CreateReportAiAdapterOptions = {},
): ReportAiAdapter {
  const deterministicReportAdapter = createDeterministicReportAdapter();

  if (!providerKey) {
    return deterministicReportAdapter;
  }

  return createProviderBackedReportAdapter(
    providerKey,
    options,
    deterministicReportAdapter,
  );
}
