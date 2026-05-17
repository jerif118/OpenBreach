import type {
  GenerateRemediationReportBatchOutput,
  SelectedMunicipalityReportContext,
} from "../../shared/contracts.ts";

export function assertCompleteReportBatch(
  batch: GenerateRemediationReportBatchOutput,
  selected: readonly SelectedMunicipalityReportContext[],
): void {
  const selectedIds = new Set<string>();

  for (const context of selected) {
    const municipalityId = context.municipality.id;
    if (selectedIds.has(municipalityId)) {
      throw new Error(
        `Duplicate selected municipality context: ${municipalityId}.`,
      );
    }
    selectedIds.add(municipalityId);
  }

  if (
    batch.summary.completed !== selected.length ||
    batch.summary.failed !== 0 ||
    batch.results.length !== selected.length
  ) {
    throw new Error(
      "Fixture report generation must complete all selected records.",
    );
  }

  const resultIds = new Set<string>();
  for (const record of batch.results) {
    if (resultIds.has(record.municipalityId)) {
      throw new Error(
        `Duplicate report result for municipality ${record.municipalityId}.`,
      );
    }
    resultIds.add(record.municipalityId);

    if (!selectedIds.has(record.municipalityId)) {
      throw new Error(
        `Unexpected report result for municipality ${record.municipalityId}.`,
      );
    }
  }

  for (const municipalityId of selectedIds) {
    if (!resultIds.has(municipalityId)) {
      throw new Error(
        `Missing report result for selected municipality ${municipalityId}.`,
      );
    }
  }
}
