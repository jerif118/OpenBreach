import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import municipalitiesFixture from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import enrichedScanFixture from "../data/scans/latest.enriched-scan-results.json" with { type: "json" };
import { assertCompleteReportBatch } from "../src/mastra/workflows/report-batch-completeness.ts";
import { renderReportBatchPdfs } from "../src/mastra/workflows/report-workflow.ts";
import { selectTopRiskReportContexts } from "../src/mastra/tools/report-context-tool.ts";
import {
  generateRemediationReportResultSchema,
  type GenerateRemediationReportBatchOutput,
  municipalitySchema,
  type ReportGenerationArtifact,
  reportGenerationArtifactSchema,
  reportPersistenceArgsSchema,
  reportPersistenceFindingSchema,
  scanResultSchema,
  selectedMunicipalityReportContextSchema,
  type GenerateRemediationReportResult,
  type ReportPersistenceArgs,
  type SelectedMunicipalityReportContext,
} from "../src/shared/contracts.ts";
import { readCliOptions } from "./report-generation-cli.ts";

type ReportBatchOutput = GenerateRemediationReportBatchOutput;
type ReportBatchRecord = ReportBatchOutput["results"][number];

type CompletedReportResult = Extract<
  GenerateRemediationReportResult,
  { status: "completed" }
>;

function sanitizePersistenceFindings(
  findings: CompletedReportResult["report"]["findings"],
): ReportPersistenceArgs["findings"] {
  return findings.map(({ raw: _raw, ...finding }) =>
    reportPersistenceFindingSchema.parse(finding),
  );
}

function requireSelectedContext(
  selectedByMunicipalityId: Map<string, SelectedMunicipalityReportContext>,
  municipalityId: string,
): SelectedMunicipalityReportContext {
  const context = selectedByMunicipalityId.get(municipalityId);

  if (!context) {
    throw new Error(`Missing selected context for ${municipalityId}.`);
  }

  return context;
}

function requireCompletedResult(
  record: ReportBatchRecord,
): CompletedReportResult {
  const result = generateRemediationReportResultSchema.parse(record.result);

  if (result.status !== "completed") {
    throw new Error(`Expected completed report for ${record.municipalityId}.`);
  }

  return result;
}

function toPersistenceArgs({
  result,
  context,
}: {
  result: CompletedReportResult;
  context: SelectedMunicipalityReportContext;
}): ReportPersistenceArgs {
  if (!result.metadata.pdf || !result.metadata.artifacts) {
    throw new Error(
      `Completed report ${result.report.id} is missing PDF metadata.`,
    );
  }

  return reportPersistenceArgsSchema.parse({
    externalId: result.report.id,
    municipalityExternalId: context.municipality.id,
    scanResultExternalId: context.scan.id,
    status: "completed",
    generatedAt: result.report.generatedAt,
    summary: result.report.summary,
    priorityActions: result.report.priorityActions,
    findings: sanitizePersistenceFindings(result.report.findings),
    generatedBy: result.report.generatedBy,
    pdf: result.metadata.pdf,
    artifacts: result.metadata.artifacts,
  });
}

function buildPersistenceArgs({
  batch,
  selected,
}: {
  batch: ReportBatchOutput;
  selected: SelectedMunicipalityReportContext[];
}): ReportPersistenceArgs[] {
  const selectedByMunicipalityId = new Map(
    selected.map((context) => [context.municipality.id, context]),
  );

  return batch.results.map((record) =>
    toPersistenceArgs({
      context: requireSelectedContext(
        selectedByMunicipalityId,
        record.municipalityId,
      ),
      result: requireCompletedResult(record),
    }),
  );
}

function buildArtifact({
  batch,
  selected,
  convexPersistenceArgs,
}: {
  batch: ReportBatchOutput;
  selected: SelectedMunicipalityReportContext[];
  convexPersistenceArgs: ReportPersistenceArgs[];
}): ReportGenerationArtifact {
  return reportGenerationArtifactSchema.parse({
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
  });
}

async function writeArtifact(
  outputPath: string,
  artifact: ReportGenerationArtifact,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
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
  throw new Error(
    "No reportable fixture records were selected for report generation.",
  );
}

const batch = await renderReportBatchPdfs({
  batchId: "latest-report-generation",
  contexts: selected,
  generatedAt: options.generatedAt,
  providerKey: "",
});

assertCompleteReportBatch(batch, selected);

const convexPersistenceArgs = buildPersistenceArgs({ batch, selected });

const artifact = buildArtifact({ batch, selected, convexPersistenceArgs });

await writeArtifact(options.outputPath, artifact);

console.log(
  `Report generation complete: ${batch.summary.completed}/${batch.summary.requested} reports, ${convexPersistenceArgs.length} persistence payloads, artifact ${options.outputPath}`,
);
