import {
  rawScanEvidenceSchema,
  type RawScanEvidence,
} from "../shared/contracts.ts";

export type RawScanPersistenceResult = Omit<
  RawScanEvidence,
  "municipalityId"
> & {
  municipalityExternalId: string;
};

export type RawScanPersistenceArgs = {
  results: RawScanPersistenceResult[];
};

export function toRawScanPersistenceArgs(
  results: readonly RawScanEvidence[],
): RawScanPersistenceArgs {
  return {
    results: results.map((result) => {
      const validated = rawScanEvidenceSchema.parse(result);
      const { municipalityId, ...evidence } = validated;

      return {
        municipalityExternalId: municipalityId,
        ...evidence,
      };
    }),
  };
}
