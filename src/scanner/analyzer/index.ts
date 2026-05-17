import {
  passiveScanEvidenceSchema,
  type PassiveScanEvidence,
  type TechnologyFingerprint,
  type VulnerabilityHypothesis,
} from "../../shared/contracts.ts";
import {
  deduplicateFingerprints,
  deduplicateHypotheses,
} from "./deduplicate.ts";
import {
  toTechnologyFingerprint,
  toVulnerabilityHypothesis,
} from "./mappers.ts";
import { FINGERPRINT_RULES, HYPOTHESIS_RULES } from "./rules.ts";
import {
  AnalyzerError,
  DEFAULT_CONFIDENCE_THRESHOLD,
  type AnalyzerOptions,
  type AnalyzerResult,
} from "./types.ts";

export { AnalyzerError } from "./types.ts";
export type {
  AnalyzerOptions,
  AnalyzerResult,
  FingerprintRule,
  HypothesisRule,
} from "./types.ts";

export function defaultOptions(): Required<AnalyzerOptions> {
  return {
    now: () => new Date().toISOString(),
    idGenerator: () => crypto.randomUUID(),
    confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  };
}

export function analyzeEvidence(
  evidence: PassiveScanEvidence,
  options?: AnalyzerOptions,
): AnalyzerResult {
  const parseResult = passiveScanEvidenceSchema.safeParse(evidence);
  if (!parseResult.success) {
    throw new AnalyzerError(
      "INVALID_EVIDENCE",
      `Invalid evidence: ${parseResult.error.message}`,
    );
  }

  const resolvedOptions: Required<AnalyzerOptions> = {
    ...defaultOptions(),
    ...options,
  };

  const now = resolvedOptions.now();

  // Run fingerprint rules
  const rawFingerprints = FINGERPRINT_RULES.flatMap((rule) =>
    rule(evidence, resolvedOptions),
  );

  // Deduplicate fingerprints
  const dedupedFingerprints = deduplicateFingerprints(rawFingerprints);

  // Filter fingerprints by confidence threshold
  const filteredFingerprints = dedupedFingerprints.filter(
    (fp) => fp.confidence >= resolvedOptions.confidenceThreshold,
  );

  // Map to full TechnologyFingerprint shapes
  const fingerprints: TechnologyFingerprint[] = filteredFingerprints.map(
    (fp, index) =>
      toTechnologyFingerprint(
        fp,
        evidence.targetId,
        resolvedOptions.idGenerator(),
        now,
      ),
  );

  // Run hypothesis rules (passing deduplicated fingerprints)
  const rawHypotheses = HYPOTHESIS_RULES.flatMap((rule) =>
    rule(evidence, fingerprints, resolvedOptions),
  );

  // Deduplicate hypotheses
  const dedupedHypotheses = deduplicateHypotheses(rawHypotheses);

  // Map to full VulnerabilityHypothesis shapes
  const hypotheses: VulnerabilityHypothesis[] = dedupedHypotheses.map((hyp) =>
    toVulnerabilityHypothesis(
      hyp,
      evidence.targetId,
      resolvedOptions.idGenerator(),
      now,
    ),
  );

  return { fingerprints, hypotheses };
}
