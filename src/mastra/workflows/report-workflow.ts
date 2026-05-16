import { createReportAiAdapter, type ReportAiProvider } from "../../ai/report-adapter.ts";
import { renderReportPdf } from "../../reports/pdf-renderer.ts";
import {
  generateRemediationReportInputSchema,
  generateRemediationReportResultSchema,
  selectedMunicipalityReportContextSchema,
  type GenerateRemediationReportInput,
  type GenerateRemediationReportResult,
  type SelectedMunicipalityReportContext,
} from "../../shared/contracts.ts";

export type GenerateRemediationReportBatchInput = {
  id?: string;
  contexts: SelectedMunicipalityReportContext[];
  generatedAt?: string;
  providerKey?: string;
};

export type GenerateRemediationReportBatchRecord = {
  municipalityId: string;
  rank?: number;
  result: GenerateRemediationReportResult;
};

export type GenerateRemediationReportBatchOutput = {
  id: string;
  generatedAt: string;
  provider: ReportAiProvider;
  summary: {
    requested: number;
    completed: number;
    failed: number;
  };
  results: GenerateRemediationReportBatchRecord[];
};

export type RenderReportBatchPdfsInput = Omit<GenerateRemediationReportBatchInput, "id"> & {
  batchId?: string;
  outputDirectory?: string;
};

export async function generateRemediationReport(input: GenerateRemediationReportInput) {
  const adapter = createReportAiAdapter();
  return await adapter.generateRemediationReport(input);
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
  const message = error instanceof Error ? error.message : "Unknown report generation error.";

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
      const input = generateRemediationReportInputSchema.parse({
        municipality: context.municipality,
        scan: context.scan,
      });
      const report = await adapter.generateRemediationReport(input);

      results.push({
        municipalityId: context.municipality.id,
        rank: context.rank,
        result: generateRemediationReportResultSchema.parse({
          status: "completed",
          report,
          metadata: {
            reportId: report.id,
            municipalityId: report.municipalityId,
            status: "completed",
            generatedAt: report.generatedAt,
            updatedAt: generatedAt,
          },
        }),
      });
    } catch (error) {
      results.push({
        municipalityId,
        rank: rawContext.rank,
        result: buildFailedResult({ error, generatedAt, municipalityId }),
      });
    }
  }

  const completed = results.filter((result) => result.result.status === "completed").length;

  return {
    id,
    generatedAt,
    provider: adapter.provider,
    summary: {
      requested: contexts.length,
      completed,
      failed: results.length - completed,
    },
    results,
  };
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

    const pdf = await renderReportPdf({
      municipalityName: context.municipality.name,
      report: record.result.report,
      scan: context.scan,
      generatedAt: batch.generatedAt,
      outputDirectory,
    });

    results.push({
      ...record,
      result: generateRemediationReportResultSchema.parse({
        ...record.result,
        metadata: {
          ...record.result.metadata,
          pdf,
          updatedAt: batch.generatedAt,
        },
      }),
    });
  }

  return {
    ...batch,
    results,
  };
}

export const reportWorkflow = {
  id: "deff-acc-remediation-report-workflow",
  run: generateRemediationReport,
  runBatch: generateRemediationReportBatch,
  renderBatchPdfs: renderReportBatchPdfs,
};
