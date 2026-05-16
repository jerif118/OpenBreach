import { scanResultSchema, type ScanResult } from "../shared/contracts.ts";

export type EnrichedScanPersistenceResult = Omit<
  ScanResult,
  "municipalityId"
> & {
  municipalityExternalId: string;
};

export type EnrichedScanPersistenceArgs = {
  results: EnrichedScanPersistenceResult[];
};

export function toEnrichedScanPersistenceArgs(
  results: readonly ScanResult[],
): EnrichedScanPersistenceArgs {
  return {
    results: results.map((result) => {
      const validated = scanResultSchema.parse(result);
      const { municipalityId, ...scanResult } = validated;

      return {
        municipalityExternalId: municipalityId,
        ...scanResult,
      };
    }),
  };
}
