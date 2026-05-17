import { createReportAiAdapter } from "../../ai/report-adapter.ts";
import { renderReportArtifacts } from "../../reports/pdf-renderer.ts";
import {
  generateRemediationReportInputSchema,
  generateRemediationReportBatchOutputSchema,
  generateRemediationReportResultSchema,
  selectedMunicipalityReportContextSchema,
  type GenerateRemediationReportBatchOutput as ContractGenerateRemediationReportBatchOutput,
  type GenerateRemediationReportBatchRecord as ContractGenerateRemediationReportBatchRecord,
  type GenerateRemediationReportInput,
  type GenerateRemediationReportResult,
  type RemediationReport,
  type RemediationReportVariants,
  type SelectedMunicipalityReportContext,
} from "../../shared/contracts.ts";

export type GenerateRemediationReportBatchInput = {
  id?: ContractGenerateRemediationReportBatchOutput["id"];
  contexts: SelectedMunicipalityReportContext[];
  generatedAt?: ContractGenerateRemediationReportBatchOutput["generatedAt"];
  providerKey?: string;
};

export type GenerateRemediationReportBatchRecord =
  ContractGenerateRemediationReportBatchRecord;

export type GenerateRemediationReportBatchOutput =
  ContractGenerateRemediationReportBatchOutput;

export type RenderReportBatchPdfsInput = Omit<
  GenerateRemediationReportBatchInput,
  "id"
> & {
  batchId?: string;
  outputDirectory?: string;
};

export async function generateRemediationReport(
  input: GenerateRemediationReportInput,
): Promise<RemediationReport> {
  const adapter = createReportAiAdapter();
  return await adapter.generateRemediationReport(input);
}

export async function generateRemediationReportVariants(
  input: GenerateRemediationReportInput,
): Promise<RemediationReportVariants> {
  const adapter = createReportAiAdapter();
  return await adapter.generateRemediationReportVariants(input);
}

function buildReportInput(
  context: SelectedMunicipalityReportContext,
  generatedAt: string,
): GenerateRemediationReportInput {
  return generateRemediationReportInputSchema.parse({
    municipality: context.municipality,
    scan: context.scan,
    generatedAt,
    sourceData: context,
  });
}

function buildCompletedRecord({
  context,
  generatedAt,
  reports,
}: {
  context: SelectedMunicipalityReportContext;
  generatedAt: string;
  reports: RemediationReportVariants;
}): GenerateRemediationReportBatchRecord {
  const report = reports.technical;

  return {
    municipalityId: context.municipality.id,
    rank: context.rank,
    result: generateRemediationReportResultSchema.parse({
      status: "completed",
      report,
      reports,
      metadata: {
        reportId: report.id,
        municipalityId: report.municipalityId,
        status: "completed",
        generatedAt: report.generatedAt,
        updatedAt: generatedAt,
      },
    }),
  };
}

function buildFailedResult({
  error,
  generatedAt,
  municipalityId,
}: {
  error: unknown;
  generatedAt: string;
  municipalityId: string;
}): GenerateRemediationReportResult {
  const message =
    error instanceof Error ? error.message : "Unknown report generation error.";

  return generateRemediationReportResultSchema.parse({
    status: "failed",
    error: message,
    metadata: {
      reportId: `report-failed-${municipalityId}`,
      municipalityId,
      status: "failed",
      updatedAt: generatedAt,
      error: message,
    },
  });
}

function addRenderedMetadata(
  record: GenerateRemediationReportBatchRecord,
  rendered: Awaited<ReturnType<typeof renderReportArtifacts>>,
  generatedAt: string,
): GenerateRemediationReportBatchRecord {
  return {
    ...record,
    result: generateRemediationReportResultSchema.parse({
      ...record.result,
      metadata: {
        ...record.result.metadata,
        pdf: rendered.pdf,
        artifacts: rendered.artifacts,
        updatedAt: generatedAt,
      },
    }),
  };
}

export async function generateRemediationReportBatch({
  id = `report-batch-${new Date().toISOString()}`,
  contexts,
  generatedAt = new Date().toISOString(),
  providerKey,
}: GenerateRemediationReportBatchInput): Promise<GenerateRemediationReportBatchOutput> {
  const adapter = createReportAiAdapter(providerKey);
  const results: GenerateRemediationReportBatchRecord[] = [];

  for (const rawContext of contexts) {
    const municipalityId = rawContext.municipality?.id ?? "unknown";

    try {
      const context = selectedMunicipalityReportContextSchema.parse(rawContext);
      const input = buildReportInput(context, generatedAt);
      const reports = await adapter.generateRemediationReportVariants(input);

      results.push(buildCompletedRecord({ context, generatedAt, reports }));
    } catch (error) {
      results.push({
        municipalityId,
        rank: rawContext.rank,
        result: buildFailedResult({ error, generatedAt, municipalityId }),
      });
    }
  }

  const completed = results.filter(
    (result) => result.result.status === "completed",
  ).length;

  return generateRemediationReportBatchOutputSchema.parse({
    id,
    generatedAt,
    provider: adapter.provider,
    summary: {
      requested: contexts.length,
      completed,
      failed: results.length - completed,
    },
    results,
  });
}

export async function renderReportBatchPdfs({
  batchId,
  contexts,
  generatedAt,
  outputDirectory,
  providerKey,
}: RenderReportBatchPdfsInput): Promise<GenerateRemediationReportBatchOutput> {
  const batch = await generateRemediationReportBatch({
    id: batchId,
    contexts,
    generatedAt,
    providerKey,
  });
  const contextByMunicipalityId = new Map(
    contexts.map((context) => [context.municipality.id, context] as const),
  );
  const results: GenerateRemediationReportBatchRecord[] = [];

  for (const record of batch.results) {
    if (record.result.status !== "completed") {
      results.push(record);
      continue;
    }

    const context = contextByMunicipalityId.get(record.municipalityId);

    if (!context) {
      results.push(record);
      continue;
    }

    const rendered = await renderReportArtifacts({
      municipalityName: context.municipality.name,
      reports: record.result.reports,
      generatedAt: batch.generatedAt,
      outputDirectory,
    });

    results.push(addRenderedMetadata(record, rendered, batch.generatedAt));
  }

  return generateRemediationReportBatchOutputSchema.parse({
    ...batch,
    results,
  });
}

export const reportWorkflow = {
  id: "deff-acc-remediation-report-workflow",
  run: generateRemediationReport,
  runVariants: generateRemediationReportVariants,
  runBatch: generateRemediationReportBatch,
  renderBatchPdfs: renderReportBatchPdfs,
};
