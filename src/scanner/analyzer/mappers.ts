import {
  technologyFingerprintSchema,
  vulnerabilityHypothesisSchema,
  type TechnologyFingerprint,
  type VulnerabilityHypothesis,
} from "../../shared/contracts.ts";

export function toTechnologyFingerprint(
  input: Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >,
  targetId: string,
  fingerprintId: string,
  detectedAt: string,
): TechnologyFingerprint {
  const result: TechnologyFingerprint = {
    fingerprintId,
    targetId,
    technology: input.technology,
    category: input.category,
    confidence: input.confidence,
    detectedAt,
    version: input.version,
    versionConfidence: input.versionConfidence,
    evidence: input.evidence,
  };

  return technologyFingerprintSchema.parse(result);
}

export function toVulnerabilityHypothesis(
  input: Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >,
  targetId: string,
  hypothesisId: string,
  createdAt: string,
): VulnerabilityHypothesis {
  const result: VulnerabilityHypothesis = {
    hypothesisId,
    targetId,
    title: input.title,
    status: "hypothesis",
    createdAt,
    proposedBy: "analyzer",
    description: input.description,
    cweId: input.cweId,
    cvssScore: input.cvssScore,
    affectedComponents: input.affectedComponents,
  };

  return vulnerabilityHypothesisSchema.parse(result);
}
