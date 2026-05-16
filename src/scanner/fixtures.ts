import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { rawScanEvidenceSchema, type RawScanEvidence } from "../shared/contracts.ts";

export function normalizeScanFixtureResults(results: readonly unknown[]): RawScanEvidence[] {
  return rawScanEvidenceSchema
    .array()
    .parse(results)
    .toSorted((left, right) => left.municipalityId.localeCompare(right.municipalityId));
}

export async function exportScanFixture(results: readonly unknown[], outputPath: string): Promise<void> {
  const normalizedResults = normalizeScanFixtureResults(results);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(normalizedResults, null, 2)}\n`);
}
