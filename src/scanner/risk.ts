import {
  scanResultSchema,
  type RawScanEvidence,
  type RiskLevel,
  type ScanResult,
} from "../shared/contracts.ts";
import { generateFindings } from "./riskFindings.ts";

export { BASELINE_SECURITY_HEADERS, generateFindings } from "./riskFindings.ts";

export const RISK_LEVEL_THRESHOLDS = {
  low: { min: 0, max: 24 },
  medium: { min: 25, max: 49 },
  high: { min: 50, max: 74 },
  critical: { min: 75, max: 100 },
} as const;

export const RISK_FINDING_WEIGHTS = {
  unreachable: 30,
  invalidTls: 25,
  expiredTls: 20,
  missingHsts: 10,
  missingContentSecurityPolicy: 10,
  missingContentTypeOptions: 8,
  missingFrameProtection: 7,
  exposedAdminPath: 15,
  cmsDetected: 5,
  knownVulnerableCms: 35,
} as const;

export function enrichScanEvidence(evidence: RawScanEvidence): ScanResult {
  const findings = generateFindings(evidence);
  const riskScore = clampScore(
    findings.reduce((total, finding) => total + findingWeight(finding.id), 0),
  );

  return scanResultSchema.parse({
    id: `scan-${evidence.municipalityId}-${evidence.scannedAt.slice(0, 10)}`,
    municipalityId: evidence.municipalityId,
    scannedAt: evidence.scannedAt,
    requestedUrl: evidence.requestedUrl,
    finalUrl: evidence.finalUrl,
    reachable: evidence.reachable,
    httpStatus: evidence.httpStatus,
    headers: evidence.headers,
    tls: evidence.tls,
    cms: evidence.cms,
    adminExposure: evidence.adminExposure,
    errors: evidence.errors,
    riskScore,
    riskLevel: riskLevelForScore(riskScore),
    findings,
    score: riskScore,
  });
}

export function enrichScanEvidenceBatch(
  results: readonly RawScanEvidence[],
): ScanResult[] {
  return results
    .map(enrichScanEvidence)
    .toSorted((left, right) =>
      left.municipalityId.localeCompare(right.municipalityId),
    );
}

export function riskLevelForScore(score: number): RiskLevel {
  const clamped = clampScore(score);
  if (clamped >= RISK_LEVEL_THRESHOLDS.critical.min) {
    return "critical";
  }
  if (clamped >= RISK_LEVEL_THRESHOLDS.high.min) {
    return "high";
  }
  if (clamped >= RISK_LEVEL_THRESHOLDS.medium.min) {
    return "medium";
  }
  return "low";
}

function findingWeight(findingId: string): number {
  if (findingId === "finding-availability-unreachable")
    return RISK_FINDING_WEIGHTS.unreachable;
  if (findingId === "finding-tls-invalid")
    return RISK_FINDING_WEIGHTS.invalidTls;
  if (findingId === "finding-tls-expired")
    return RISK_FINDING_WEIGHTS.expiredTls;
  if (findingId === "finding-header-missing-hsts")
    return RISK_FINDING_WEIGHTS.missingHsts;
  if (findingId === "finding-header-missing-csp")
    return RISK_FINDING_WEIGHTS.missingContentSecurityPolicy;
  if (findingId === "finding-header-missing-content-type-options")
    return RISK_FINDING_WEIGHTS.missingContentTypeOptions;
  if (findingId === "finding-header-missing-frame-protection")
    return RISK_FINDING_WEIGHTS.missingFrameProtection;
  if (findingId === "finding-admin-path-exposed")
    return RISK_FINDING_WEIGHTS.exposedAdminPath;
  if (findingId === "finding-cms-detected")
    return RISK_FINDING_WEIGHTS.cmsDetected;
  if (findingId.startsWith("finding-known-vulnerable-"))
    return RISK_FINDING_WEIGHTS.knownVulnerableCms;
  return 0;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}
