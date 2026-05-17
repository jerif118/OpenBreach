import {
  enrichedScanPersistenceArgsSchema,
  scanResultSchema,
  type EnrichedScanPersistenceArgs,
  type ScanResult,
} from "../shared/contracts.ts";

export function toEnrichedScanPersistenceArgs(
  results: readonly ScanResult[],
): EnrichedScanPersistenceArgs {
  return enrichedScanPersistenceArgsSchema.parse({
    results: results.map((result) => {
      const validated = scanResultSchema.parse(result);
      const { municipalityId, ...scanResult } = validated;

      return {
        municipalityExternalId: municipalityId,
        ...scanResult,
      };
    }),
  });
}
