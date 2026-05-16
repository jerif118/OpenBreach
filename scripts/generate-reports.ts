import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { renderReportBatchPdfs } from "../src/mastra/workflows/report-workflow.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  generateRemediationReportResultSchema,
  municipalitySchema,
  scanResultSchema,
  selectedMunicipalityReportContextSchema,
  type GenerateRemediationReportResult,
  type SelectedMunicipalityReportContext,
} from "../src/shared/contracts.ts";

const DEFAULT_OUTPUT_PATH = "data/reports/latest.report-generation.json";
const DEFAULT_GENERATED_AT = new Date().toISOString();

type CliOptions = {
  generatedAt: string;
  limit: number;
  outputPath: string;
};

type ReportPersistenceArgs = {
  externalId: string;
  municipalityExternalId: string;
  scanResultExternalId?: string;
  status: "completed";
  generatedAt: string;
  summary: string;
  priorityActions: string[];
  findings: GenerateRemediationReportResult & { status: "completed" } extends { report: { findings: infer Findings } }
    ? Findings
    : never;
  generatedBy: "deterministic-fallback" | "ai-provider";
  pdf: NonNullable<GenerateRemediationReportResult & { status: "completed" } extends { metadata: { pdf?: infer Pdf } } ? Pdf : never>;
};

function readCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    generatedAt: DEFAULT_GENERATED_AT,
    limit: 10,
    outputPath: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--generated-at" && value) {
      options.generatedAt = value;
      index += 1;
      continue;
    }

    if (flag === "--limit" && value) {
      options.limit = Number.parseInt(value, 10);
      index += 1;
      continue;
    }

    if (flag === "--output" && value) {
      options.outputPath = value;
      index += 1;
      continue;
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 10) {
    throw new Error("--limit must be an integer between 1 and 10.");
  }

  return options;
}

function toPersistenceArgs({
  result,
  context,
}: {
  result: Extract<GenerateRemediationReportResult, { status: "completed" }>;
  context: SelectedMunicipalityReportContext;
}): ReportPersistenceArgs {
  if (!result.metadata.pdf) {
    throw new Error(`Completed report ${result.report.id} is missing PDF metadata.`);
  }

  return {
    externalId: result.report.id,
    municipalityExternalId: context.municipality.id,
    scanResultExternalId: context.scan.id,
    status: "completed",
    generatedAt: result.report.generatedAt,
    summary: result.report.summary,
    priorityActions: result.report.priorityActions,
    findings: result.report.findings,
    generatedBy: result.report.generatedBy,
    pdf: result.metadata.pdf,
  };
}

const options = readCliOptions(process.argv.slice(2));
const municipalities = municipalitySchema.array().parse(municipalitiesFixture);
const scans = scanResultSchema.array().parse(enrichedScanFixture);
const selected = selectTopRiskReportContexts({
  municipalities,
  scans,
  source: "fixture",
  selectedAt: options.generatedAt,
  limit: options.limit,
});

if (selected.length === 0) {
  throw new Error("No reportable fixture records were selected for report generation.");
}

const batch = await renderReportBatchPdfs({
  batchId: "latest-report-generation",
  contexts: selected,
  generatedAt: options.generatedAt,
  providerKey: "",
});

if (batch.summary.completed !== selected.length || batch.summary.failed !== 0) {
  throw new Error("Fixture report generation must complete all selected records.");
}

const selectedByMunicipalityId = new Map(selected.map((context) => [context.municipality.id, context]));
const convexPersistenceArgs: ReportPersistenceArgs[] = batch.results.map((record) => {
  const result = generateRemediationReportResultSchema.parse(record.result);
  const context = selectedByMunicipalityId.get(record.municipalityId);

  if (!context) {
    throw new Error(`Missing selected context for ${record.municipalityId}.`);
  }

  if (result.status !== "completed") {
    throw new Error(`Expected completed report for ${record.municipalityId}.`);
  }

  return toPersistenceArgs({ result, context });
});

const artifact = {
  id: batch.id,
  generatedAt: batch.generatedAt,
  provider: batch.provider,
  selected: selectedMunicipalityReportContextSchema.array().parse(selected),
  batch,
  convexPersistenceArgs,
  persistence: {
    argsCommand: "pnpm report:persist:args",
    liveConvexCommand: "convex run reports:persistGenerated '<args>'",
    note: "Replace fixture external IDs with live Convex document IDs and run with an authenticated Convex deployment.",
  },
};

await mkdir(dirname(options.outputPath), { recursive: true });
await writeFile(options.outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

console.log(
  `Report generation complete: ${batch.summary.completed}/${batch.summary.requested} reports, ${convexPersistenceArgs.length} persistence payloads, artifact ${options.outputPath}`,
);
