import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  rawScanEvidenceSchema,
  scanResultSchema,
  type RawScanEvidence,
  type ScanResult,
} from "../shared/contracts.ts";
import { enrichScanEvidenceBatch } from "./risk.ts";

export function normalizeScanFixtureResults(
  results: readonly unknown[],
): RawScanEvidence[] {
  return rawScanEvidenceSchema
    .array()
    .parse(results)
    .toSorted((left, right) =>
      left.municipalityId.localeCompare(right.municipalityId),
    );
}

export async function exportScanFixture(
  results: readonly unknown[],
  outputPath: string,
): Promise<void> {
  const normalizedResults = normalizeScanFixtureResults(results);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(normalizedResults, null, 2)}\n`,
  );
}

export function normalizeEnrichedScanFixtureResults(
  results: readonly unknown[],
): ScanResult[] {
  return scanResultSchema
    .array()
    .parse(results)
    .toSorted((left, right) =>
      left.municipalityId.localeCompare(right.municipalityId),
    );
}

export async function exportEnrichedScanFixture(
  results: readonly RawScanEvidence[],
  outputPath: string,
): Promise<void> {
  const enrichedResults = normalizeEnrichedScanFixtureResults(
    enrichScanEvidenceBatch(results),
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(enrichedResults, null, 2)}\n`);
}
