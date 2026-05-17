import type {
  PassiveScanEvidence,
  TechnologyFingerprint,
  VulnerabilityHypothesis,
} from "../../shared/contracts.ts";

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
export const CMS_VULNERABILITY_CONFIDENCE_THRESHOLD = 0.8;
export const TLS_EXPIRY_DAYS = 30;

export type AnalyzerOptions = {
  now?: () => string;
  idGenerator?: () => string;
  confidenceThreshold?: number;
};

export type AnalyzerResult = {
  fingerprints: TechnologyFingerprint[];
  hypotheses: VulnerabilityHypothesis[];
};

export type FingerprintRule = (
  evidence: PassiveScanEvidence,
  options: Required<AnalyzerOptions>,
) => Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
>;

export type HypothesisRule = (
  evidence: PassiveScanEvidence,
  fingerprints: TechnologyFingerprint[],
  options: Required<AnalyzerOptions>,
) => Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
>;

export type AnalyzerErrorCode = "INVALID_EVIDENCE";

export class AnalyzerError extends Error {
  readonly code: AnalyzerErrorCode;

  constructor(code: AnalyzerErrorCode, message: string) {
    super(message);
    this.name = "AnalyzerError";
    this.code = code;
  }
}

export type DedupKey = `${string}:${string}`;

export function makeDedupKey(
  technology: string,
  category: string,
): DedupKey {
  return `${technology}:${category}`;
}
