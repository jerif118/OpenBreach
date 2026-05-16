import { readFile } from "node:fs/promises";
import packageJson from "../package.json" with { type: "json" };
import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { createReportAiAdapter } from "../src/ai/report-adapter.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  municipalitySchema,
  remediationReportSchema,
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
  throw new Error(`Expected deterministic fallback without credentials, received ${fallbackAdapter.provider}.`);
}

const providerReport: RemediationReport = {
  id: `ai-${context.scan.id}`,
  municipalityId: context.municipality.id,
  generatedAt: "2026-01-02T00:00:00.000Z",
  summary: `AI summary for ${context.municipality.name} with risk score ${context.scan.riskScore}.`,
  priorityActions: [`AI action: ${context.scan.findings[0]?.remediationHint ?? "Review evidence."}`],
  findings: context.scan.findings,
  generatedBy: "ai-provider",
};

let chatCalls = 0;
const aiAdapter = createReportAiAdapter("test-provider-key", {
  chat: async () => {
    chatCalls += 1;
    return JSON.stringify(providerReport);
  },
  provider: "openai",
  model: "gpt-5.2",
});

if (aiAdapter.provider !== "tanstack-ai") {
  throw new Error(`Expected configured credentials to select tanstack-ai, received ${aiAdapter.provider}.`);
}

const aiReport = remediationReportSchema.parse(
  await aiAdapter.generateRemediationReport({
    municipality: context.municipality,
    scan: context.scan,
  }),
);

if (chatCalls !== 1) {
  throw new Error(`Expected provider chat executor to be called once, received ${chatCalls}.`);
}

if (aiReport.generatedBy !== "ai-provider") {
  throw new Error(`Expected provider output to remain ai-provider, received ${aiReport.generatedBy}.`);
}

const invalidAdapter = createReportAiAdapter("test-provider-key", {
  chat: async () => "not valid json",
  provider: "openai",
  model: "gpt-5.2",
});
const fallbackReport = await invalidAdapter.generateRemediationReport({
  municipality: context.municipality,
  scan: context.scan,
});

if (fallbackReport.generatedBy !== "deterministic-fallback") {
  throw new Error("Invalid provider output must fall back to deterministic generation.");
}

const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

for (const excludedDependency of ["ai", "@ai-sdk/openai", "@vercel/ai", "@aws/bedrock-agentcore"]) {
  if (excludedDependency in dependencies) {
    throw new Error(`Excluded AI dependency must not be present: ${excludedDependency}`);
  }
}

const adapterSource = await readFile(new URL("../src/ai/report-adapter.ts", import.meta.url), "utf8");

if (!adapterSource.includes("@tanstack/ai-openai")) {
  throw new Error("Provider adapter package should be imported inside src/ai/report-adapter.ts.");
}

for (const path of [
  "../src/mastra/workflows/report-workflow.ts",
  "../src/shared/contracts.ts",
  "../convex/reports.ts",
]) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");

  if (source.includes("@tanstack/ai-openai")) {
    throw new Error(`Provider package detail leaked outside the adapter boundary: ${path}`);
  }
}

console.log("Report AI provider adapter boundary validation passed.");
