import {
  rawScanEvidenceSchema,
  rawScanPersistenceArgsSchema,
  type RawScanPersistenceArgs,
} from "../shared/contracts.ts";

export function toRawScanPersistenceArgs(
  results: readonly unknown[],
): RawScanPersistenceArgs {
  return rawScanPersistenceArgsSchema.parse({
    results: results.map((result) => {
      const validated = rawScanEvidenceSchema.parse(result);
      const { municipalityId, ...evidence } = validated;

      return {
        municipalityExternalId: municipalityId,
        ...evidence,
      };
    }),
  });
}
