import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";

import {
  generateRemediationReportResultSchema,
  reportPdfReferenceSchema,
  selectedMunicipalityReportContextSchema,
} from "../src/shared/contracts.ts";

function parseJsonFromCommandOutput(stdout: string) {
  const jsonLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => (line.startsWith("[") || line.startsWith("{")) && !line.startsWith("[WARN]") && !line.startsWith("$ "));

  if (!jsonLine) {
    throw new Error(`Command output did not contain a JSON payload.\nSTDOUT:\n${stdout}`);
  }

  return JSON.parse(jsonLine) as unknown[];
}

const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

if (!packageJson.scripts?.["report:generate"]) {
  throw new Error("package.json must define a report:generate command.");
}

if (!packageJson.scripts?.["report:persist:args"]) {
  throw new Error("package.json must define a report:persist:args command.");
}

const forbiddenDependencies = [
  "@aws/bedrock-agentcore",
  "@aws/bedrock-agentcore-runtime",
  "ai",
  "@vercel/ai",
  "vercel-ai",
];
const installedDependencyNames = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
]);

for (const dependency of forbiddenDependencies) {
  if (installedDependencyNames.has(dependency)) {
    throw new Error(`Report generation must not depend on excluded package ${dependency}.`);
  }
}

const run = spawnSync("pnpm", ["report:generate", "--", "--generated-at", "2026-01-01T00:00:00.000Z"], {
  encoding: "utf8",
});

if (run.status !== 0) {
  throw new Error(`report:generate failed.\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}`);
}

if (!run.stdout.includes("Report generation complete")) {
  throw new Error("report:generate must print a concise completion summary.");
}

const artifactPath = "data/reports/latest.report-generation.json";
const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
  id?: string;
  generatedAt?: string;
  provider?: string;
  selected?: unknown[];
  batch?: {
    summary?: {
      requested?: number;
      completed?: number;
      failed?: number;
    };
    results?: Array<{ municipalityId?: string; result?: unknown }>;
  };
  convexPersistenceArgs?: unknown[];
};

if (artifact.id !== "latest-report-generation") {
  throw new Error("Generated report artifact must use the stable latest-report-generation id.");
}

if (artifact.generatedAt !== "2026-01-01T00:00:00.000Z") {
  throw new Error("Generated report artifact must preserve the requested generated timestamp.");
}

if (artifact.provider !== "deterministic-fallback") {
  throw new Error(`Expected deterministic fallback provider, received ${artifact.provider}.`);
}

const selected = selectedMunicipalityReportContextSchema.array().parse(artifact.selected);

if (selected.length === 0 || selected.length > 10) {
  throw new Error(`Expected 1-10 selected report contexts, received ${selected.length}.`);
}

for (let index = 1; index < selected.length; index += 1) {
  if (selected[index - 1].scan.riskScore < selected[index].scan.riskScore) {
    throw new Error("Selected report contexts must be sorted by descending risk score.");
  }
}

if (artifact.batch?.summary?.requested !== selected.length) {
  throw new Error("Batch summary must count every selected report context.");
}

if (artifact.batch.summary.completed !== selected.length || artifact.batch.summary.failed !== 0) {
  throw new Error("End-to-end fixture report generation must complete all selected records.");
}

const results = artifact.batch.results ?? [];

if (results.length !== selected.length) {
  throw new Error("Batch results must include one record per selected context.");
}

for (const record of results) {
  const result = generateRemediationReportResultSchema.parse(record.result);

  if (result.status !== "completed") {
    throw new Error("End-to-end fixture records must be completed.");
  }

  const pdf = reportPdfReferenceSchema.parse(result.metadata.pdf);
  const artifacts = result.metadata.artifacts;
  const pdfStat = await stat(pdf.storagePath);

  if (pdfStat.size <= 0 || pdf.sizeBytes !== pdfStat.size) {
    throw new Error(`Generated PDF size metadata is invalid for ${pdf.storagePath}.`);
  }

  if (pdf.fileName !== `${result.report.municipalityId}-technical.pdf`) {
    throw new Error("Generated technical PDF filenames must be based on municipality IDs plus the technical suffix.");
  }

  if (!artifacts?.technical || !artifacts.friendly) {
    throw new Error("Completed report metadata must include both technical and friendly PDF artifacts.");
  }
}

const persistenceArgs = artifact.convexPersistenceArgs ?? [];

if (persistenceArgs.length !== selected.length) {
  throw new Error("Generated artifact must include one Convex persistence args payload per selected report.");
}

for (const arg of persistenceArgs) {
  const candidate = arg as {
    status?: string;
    pdf?: unknown;
    artifacts?: { technical?: { pdf?: unknown }; friendly?: { pdf?: unknown } };
    externalId?: string;
    municipalityExternalId?: string;
  };

  if (candidate.status !== "completed" || !candidate.externalId || !candidate.municipalityExternalId) {
    throw new Error("Convex persistence args must include completed status, externalId, and municipalityExternalId.");
  }

  reportPdfReferenceSchema.parse(candidate.pdf);

  if (!candidate.artifacts?.technical?.pdf || !candidate.artifacts?.friendly?.pdf) {
    throw new Error("Convex persistence args must include both report artifact variants.");
  }
}

const persistenceStdout = spawnSync("pnpm", ["report:persist:args"], { encoding: "utf8" });

if (persistenceStdout.status !== 0) {
  throw new Error(`report:persist:args failed.\nSTDOUT:\n${persistenceStdout.stdout}\nSTDERR:\n${persistenceStdout.stderr}`);
}

const parsedPersistenceArgs = parseJsonFromCommandOutput(persistenceStdout.stdout);

if (parsedPersistenceArgs.length !== persistenceArgs.length) {
  throw new Error("report:persist:args output must match generated artifact persistence payload count.");
}

const storageDoc = await readFile("docs/report-mvp-storage.md", "utf8");

for (const snippet of [
  "pnpm report:generate",
  "data/reports/latest.report-generation.json",
  "pnpm report:persist:args",
  "convex run reports:persistGenerated",
  "live Convex document IDs",
]) {
  if (!storageDoc.includes(snippet)) {
    throw new Error(`Report workflow documentation is missing: ${snippet}`);
  }
}

console.log("End-to-end report generation validation passed.");
