import {
  rawScanEvidenceSchema,
  rawScanPersistenceArgsSchema,
  type RawScanEvidence,
  type RawScanPersistenceArgs,
} from "../shared/contracts.ts";

export function toRawScanPersistenceArgs(
  results: readonly RawScanEvidence[],
): RawScanPersistenceArgs {
  return rawScanPersistenceArgsSchema.parse({
    results: results.map((result) => {
      const validatedEvidence = rawScanEvidenceSchema.parse(result);
      const { municipalityId, ...evidence } = validatedEvidence;

      return {
        municipalityExternalId: municipalityId,
        ...evidence,
      };
    }),
  });
}
