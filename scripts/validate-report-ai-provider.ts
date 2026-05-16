import { readFile } from "node:fs/promises";
import packageJson from "../package.json" with { type: "json" };
import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { createReportAiAdapter } from "../src/ai/report-adapter.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import { buildDeterministicReportVariants } from "../src/reports/report-composer.ts";
import { normalizeReportInput } from "../src/reports/report-normalizer.ts";
import {
  municipalitySchema,
  remediationReportSchema,
  remediationReportVariantsSchema,
  scanResultSchema,
  type RemediationReport,
} from "../src/shared/contracts.ts";

const [context] = selectTopRiskReportContexts({
  municipalities: municipalitySchema.array().parse(municipalitiesFixture),
  scans: scanResultSchema.array().parse(enrichedScanFixture),
  source: "fixture",
  selectedAt: "2026-01-01T00:00:00.000Z",
  limit: 1,
});

if (!context) {
  throw new Error("Expected at least one reportable fixture context.");
}

const fallbackAdapter = createReportAiAdapter("");

if (fallbackAdapter.provider !== "deterministic-fallback") {
  throw new Error(
    `Expected deterministic fallback without credentials, received ${fallbackAdapter.provider}.`,
  );
}

const providerReport: RemediationReport = buildDeterministicReportVariants(
  normalizeReportInput({
    municipality: context.municipality,
    scan: context.scan,
    generatedAt: "2026-01-02T00:00:00.000Z",
  }),
  "ai-provider",
  "2026-01-02T00:00:00.000Z",
).technical;

let chatCalls = 0;
const aiAdapter = createReportAiAdapter("test-provider-key", {
  chat: async ({ messages }) => {
    chatCalls += 1;
    const prompt = messages[0]?.content ?? "";

    if (prompt.includes('"variant": "friendly"')) {
      return JSON.stringify({
        ...providerReport,
        id: `ai-friendly-${context.scan.id}`,
        variant: "friendly",
        title: `Friendly Remediation Report for ${context.municipality.name}`,
      });
    }

    return JSON.stringify(providerReport);
  },
  provider: "openrouter",
  model: "anthropic/claude-sonnet-4",
});

if (aiAdapter.provider !== "tanstack-ai") {
  throw new Error(
    `Expected configured credentials to select tanstack-ai, received ${aiAdapter.provider}.`,
  );
}

const aiReports = remediationReportVariantsSchema.parse(
  await aiAdapter.generateRemediationReportVariants({
    municipality: context.municipality,
    scan: context.scan,
    generatedAt: "2026-01-02T00:00:00.000Z",
  }),
);
const aiReport = remediationReportSchema.parse(aiReports.technical);

if (chatCalls !== 2) {
  throw new Error(
    `Expected provider chat executor to be called twice, received ${chatCalls}.`,
  );
}

if (aiReport.generatedBy !== "ai-provider") {
  throw new Error(
    `Expected provider output to remain ai-provider, received ${aiReport.generatedBy}.`,
  );
}

if (aiReports.friendly.variant !== "friendly") {
  throw new Error(
    "Provider-backed generation must return the friendly report variant.",
  );
}

const invalidAdapter = createReportAiAdapter("test-provider-key", {
  chat: async () => "not valid json",
  provider: "openrouter",
  model: "anthropic/claude-sonnet-4",
});
const fallbackReports = await invalidAdapter.generateRemediationReportVariants({
  municipality: context.municipality,
  scan: context.scan,
  generatedAt: "2026-01-01T00:00:00.000Z",
});
const fallbackReport = fallbackReports.technical;

if (fallbackReport.generatedBy !== "deterministic-fallback") {
  throw new Error(
    "Invalid provider output must fall back to deterministic generation.",
  );
}

const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

if (!("@tanstack/ai-openrouter" in dependencies)) {
  throw new Error("Expected @tanstack/ai-openrouter dependency to be present.");
}

for (const excludedDependency of [
  "ai",
  "@ai-sdk/openai",
  "@tanstack/ai-openai",
  "@vercel/ai",
  "@aws/bedrock-agentcore",
]) {
  if (excludedDependency in dependencies) {
    throw new Error(
      `Excluded AI dependency must not be present: ${excludedDependency}`,
    );
  }
}

const adapterSource = await readFile(
  new URL("../src/ai/report-adapter.ts", import.meta.url),
  "utf8",
);

if (!adapterSource.includes("@tanstack/ai-openrouter")) {
  throw new Error(
    "Provider adapter package should be imported inside src/ai/report-adapter.ts.",
  );
}

if (adapterSource.includes("@tanstack/ai-openai")) {
  throw new Error(
    "OpenAI adapter package should not be used for report generation.",
  );
}

for (const path of [
  "../src/mastra/workflows/report-workflow.ts",
  "../src/shared/contracts.ts",
  "../convex/reports.ts",
]) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");

  if (
    source.includes("@tanstack/ai-openrouter") ||
    source.includes("@tanstack/ai-openai")
  ) {
    throw new Error(
      `Provider package detail leaked outside the adapter boundary: ${path}`,
    );
  }
}

console.log("Report AI provider adapter boundary validation passed.");
