import type {
  TechnologyFingerprint,
  VulnerabilityHypothesis,
} from "../../shared/contracts.ts";
import { makeDedupKey } from "./types.ts";

export function deduplicateFingerprints<
  T extends Pick<
    TechnologyFingerprint,
    "technology" | "category" | "confidence"
  >,
>(fingerprints: T[]): T[] {
  const map = new Map<string, T>();

  for (const fp of fingerprints) {
    const key = makeDedupKey(fp.technology, fp.category);
    const existing = map.get(key);
    if (!existing || fp.confidence >= existing.confidence) {
      map.set(key, fp);
    }
  }

  return Array.from(map.values());
}

export function deduplicateHypotheses<
  T extends Pick<VulnerabilityHypothesis, "title" | "cvssScore">,
>(hypotheses: T[]): T[] {
  const map = new Map<string, T>();

  for (const hyp of hypotheses) {
    const key = hyp.title;
    const existing = map.get(key);
    if (!existing || (hyp.cvssScore ?? 0) > (existing.cvssScore ?? 0)) {
      map.set(key, hyp);
    }
  }

  return Array.from(map.values());
}
