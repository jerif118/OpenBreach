import { renderReportArtifacts } from "../../reports/pdf-renderer.ts";
import {
  generateRemediationReportResultSchema,
  selectedMunicipalityReportContextSchema,
  type GenerateRemediationReportBatchOutput,
  type GenerateRemediationReportBatchRecord,
  type SelectedMunicipalityReportContext,
} from "../../shared/contracts.ts";

type RenderBatchPdfArtifactsInput = {
  batch: GenerateRemediationReportBatchOutput;
  contexts: SelectedMunicipalityReportContext[];
  outputDirectory?: string;
};

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

function buildContextByMunicipalityId(
  contexts: SelectedMunicipalityReportContext[],
): Map<string, SelectedMunicipalityReportContext> {
  const contextByMunicipalityId = new Map<
    string,
    SelectedMunicipalityReportContext
  >();

  for (const rawContext of contexts) {
    const parsed =
      selectedMunicipalityReportContextSchema.safeParse(rawContext);

    if (!parsed.success) {
      throw new Error(
        `Invalid selected report context: ${parsed.error.message}`,
      );
    }

    contextByMunicipalityId.set(parsed.data.municipality.id, parsed.data);
  }

  return contextByMunicipalityId;
}

export async function renderBatchPdfArtifacts({
  batch,
  contexts,
  outputDirectory,
}: RenderBatchPdfArtifactsInput): Promise<
  GenerateRemediationReportBatchRecord[]
> {
  const contextByMunicipalityId = buildContextByMunicipalityId(contexts);
  const results: GenerateRemediationReportBatchRecord[] = [];

  for (const record of batch.results) {
    if (record.result.status !== "completed") {
      results.push(record);
      continue;
    }

    const context = contextByMunicipalityId.get(record.municipalityId);

    if (!context) {
      throw new Error(
        `Missing selected report context for completed report ${record.municipalityId}.`,
      );
    }

    const rendered = await renderReportArtifacts({
      municipalityName: context.municipality.name,
      reports: record.result.reports,
      generatedAt: batch.generatedAt,
      outputDirectory,
    });

    results.push(addRenderedMetadata(record, rendered, batch.generatedAt));
  }

  return results;
}
