/**
 * Fixture fallback utilities for the security-validation pivot.
 *
 * These utilities are used when Convex is unavailable or when seeding
 * development data from JSON fixtures under data/targets/.
 *
 * Note: `loadFixture` uses dynamic import with JSON assertions. This works
 * in Node.js scripts and some edge runtimes. For frontend fixture fallback,
 * use the VITE_CONVEX_URL check pattern and import fixtures directly.
 */

import type {
  TargetProfileDto,
  PassiveScanEvidenceDto,
  TechnologyFingerprintDto,
  VulnerabilityHypothesisDto,
  TestPlanDto,
  ApprovalGateDto,
  ValidationResultDto,
  FindingDto,
  AuditEventDto,
  ReportArtifactDto,
} from "../types";

// ============================================================================
// Environment detection
// ============================================================================

/**
 * Check whether a Convex deployment URL is configured.
 * 
 * On the server (Convex runtime): always returns true — if code is running
 * inside a Convex function, Convex is obviously configured.
 * 
 * In the browser: checks VITE_CONVEX_URL to determine if the frontend
 * is pointed at a Convex deployment.
 */
export function isConvexConfigured(): boolean {
  // If we're in a Node.js environment (Convex server runtime), assume configured
  try {
    if (typeof process !== "undefined" && process.env) {
      // We're on the server — if CONVEX_URL is explicitly set, use it as signal
      // but if not, still return true because we're inside Convex runtime
      return true;
    }
  } catch {
    // process is not defined in browser — fall through to browser check
  }

  // Browser check: is there a Vite env var pointing to Convex?
  try {
    const metaEnv = (import.meta as unknown as Record<string, unknown>).env as
      | Record<string, string>
      | undefined;
    if (metaEnv?.VITE_CONVEX_URL) {
      return true;
    }
  } catch {
    // import.meta is not available
  }

  return false;
}

// ============================================================================
// Fixture loading
// ============================================================================

/**
 * Load a JSON fixture from `data/targets/{name}.json`.
 *
 * The returned value is cast to `T` — callers should validate with Zod
 * before treating it as a well-formed DTO.
 */
export async function loadFixture<T>(name: string): Promise<T> {
  const module = await import(`../../data/targets/${name}.json`, {
    with: { type: "json" },
  });
  return module.default as T;
}

/**
 * Load multiple fixtures keyed by a logical name.
 */
export async function loadFixtures<T extends Record<string, unknown>>(
  names: Record<keyof T, string>,
): Promise<T> {
  const entries = await Promise.all(
    Object.entries(names).map(async ([key, name]) => {
      const value = await loadFixture(name);
      return [key, value] as const;
    }),
  );
  return Object.fromEntries(entries) as T;
}

// ============================================================================
// DTO mapping from raw fixtures
// ============================================================================

/**
 * Map a raw fixture object to a `TargetProfileDto`.
 * Performs defensive casting — the caller should Zod-validate upstream.
 */
export function mapFixtureToTargetProfileDto(
  fixture: unknown,
): TargetProfileDto {
  const f = fixture as Record<string, unknown>;
  return {
    targetId: String(f.targetId ?? ""),
    name: String(f.name ?? ""),
    primaryUrl: String(f.primaryUrl ?? ""),
    riskTier: (f.riskTier as TargetProfileDto["riskTier"]) ?? "medium",
    classification:
      (f.classification as TargetProfileDto["classification"]) ?? "other",
    parentOrganization: f.parentOrganization
      ? String(f.parentOrganization)
      : undefined,
    geography: f.geography
      ? {
          country: String(
            (f.geography as Record<string, unknown>).country ?? "",
          ),
          region: String(
            (f.geography as Record<string, unknown>).region ?? "",
          ),
          city: String((f.geography as Record<string, unknown>).city ?? ""),
        }
      : undefined,
    population: f.population !== undefined ? Number(f.population) : undefined,
    latitude: f.latitude !== undefined ? Number(f.latitude) : undefined,
    longitude: f.longitude !== undefined ? Number(f.longitude) : undefined,
    metadata: f.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Map a raw fixture object to a `PassiveScanEvidenceDto`.
 */
export function mapFixtureToPassiveScanEvidenceDto(
  fixture: unknown,
): PassiveScanEvidenceDto {
  const f = fixture as Record<string, unknown>;
  return {
    evidenceId: String(f.evidenceId ?? ""),
    targetId: String(f.targetId ?? ""),
    source: String(f.source ?? ""),
    collectedAt: String(f.collectedAt ?? ""),
    requestedUrl: String(f.requestedUrl ?? ""),
    reachable: Boolean(f.reachable ?? false),
    finalUrl: f.finalUrl ? String(f.finalUrl) : undefined,
    httpStatus: f.httpStatus !== undefined ? Number(f.httpStatus) : undefined,
    headers: f.headers as Record<string, string> | undefined,
    tls: f.tls as PassiveScanEvidenceDto["tls"] | undefined,
    cms: f.cms as PassiveScanEvidenceDto["cms"] | undefined,
    adminExposure: f.adminExposure as
      | PassiveScanEvidenceDto["adminExposure"]
      | undefined,
    errors: f.errors as PassiveScanEvidenceDto["errors"] | undefined,
    runId: f.runId ? String(f.runId) : undefined,
    envelopeSource: String(f.envelopeSource ?? f.source ?? ""),
    envelopeRecordedAt: String(f.envelopeRecordedAt ?? f.collectedAt ?? ""),
    envelopeHash: String(f.envelopeHash ?? ""),
    envelopeCollectedBy: String(f.envelopeCollectedBy ?? ""),
  };
}

/**
 * Map a raw fixture object to a `TechnologyFingerprintDto`.
 */
export function mapFixtureToTechnologyFingerprintDto(
  fixture: unknown,
): TechnologyFingerprintDto {
  const f = fixture as Record<string, unknown>;
  return {
    fingerprintId: String(f.fingerprintId ?? ""),
    targetId: String(f.targetId ?? ""),
    technology: String(f.technology ?? ""),
    category:
      (f.category as TechnologyFingerprintDto["category"]) ?? "other",
    confidence: Number(f.confidence ?? 0),
    detectedAt: String(f.detectedAt ?? ""),
    version: f.version ? String(f.version) : undefined,
    versionConfidence:
      f.versionConfidence !== undefined
        ? Number(f.versionConfidence)
        : undefined,
    evidence: f.evidence as string[] | undefined,
    cpe: f.cpe ? String(f.cpe) : undefined,
    runId: f.runId ? String(f.runId) : undefined,
    envelopeSource: String(f.envelopeSource ?? ""),
    envelopeRecordedAt: String(f.envelopeRecordedAt ?? ""),
    envelopeHash: String(f.envelopeHash ?? ""),
    envelopeCollectedBy: String(f.envelopeCollectedBy ?? ""),
  };
}

/**
 * Map a raw fixture object to a `VulnerabilityHypothesisDto`.
 */
export function mapFixtureToVulnerabilityHypothesisDto(
  fixture: unknown,
): VulnerabilityHypothesisDto {
  const f = fixture as Record<string, unknown>;
  return {
    hypothesisId: String(f.hypothesisId ?? ""),
    targetId: String(f.targetId ?? ""),
    title: String(f.title ?? ""),
    status:
      (f.status as VulnerabilityHypothesisDto["status"]) ?? "hypothesis",
    createdAt: String(f.createdAt ?? ""),
    proposedBy: String(f.proposedBy ?? ""),
    description: f.description ? String(f.description) : undefined,
    cweId: f.cweId ? String(f.cweId) : undefined,
    cvssScore: f.cvssScore !== undefined ? Number(f.cvssScore) : undefined,
    affectedComponents: f.affectedComponents as string[] | undefined,
    prerequisites: f.prerequisites as string[] | undefined,
    testPlanId: f.testPlanId ? String(f.testPlanId) : undefined,
    runId: f.runId ? String(f.runId) : undefined,
    metadata: f.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Map a raw fixture object to a `TestPlanDto`.
 */
export function mapFixtureToTestPlanDto(fixture: unknown): TestPlanDto {
  const f = fixture as Record<string, unknown>;
  const steps = (f.steps as TestPlanDto["steps"] | undefined) ?? [];
  return {
    planId: String(f.planId ?? ""),
    targetId: String(f.targetId ?? ""),
    title: String(f.title ?? ""),
    status: (f.status as TestPlanDto["status"]) ?? "draft",
    createdAt: String(f.createdAt ?? ""),
    steps,
    hypothesisIds: f.hypothesisIds as string[] | undefined,
    approver: f.approver ? String(f.approver) : undefined,
    approvedAt: f.approvedAt ? String(f.approvedAt) : undefined,
    estimatedDurationMinutes:
      f.estimatedDurationMinutes !== undefined
        ? Number(f.estimatedDurationMinutes)
        : undefined,
    runId: f.runId ? String(f.runId) : undefined,
    metadata: f.metadata as Record<string, unknown> | undefined,
    stepCount: steps.length,
  };
}

/**
 * Map a raw fixture object to an `ApprovalGateDto`.
 */
export function mapFixtureToApprovalGateDto(
  fixture: unknown,
): ApprovalGateDto {
  const f = fixture as Record<string, unknown>;
  return {
    gateId: String(f.gateId ?? ""),
    targetId: String(f.targetId ?? ""),
    gateType: (f.gateType as ApprovalGateDto["gateType"]) ?? "intake",
    status: (f.status as ApprovalGateDto["status"]) ?? "pending",
    requestedAt: String(f.requestedAt ?? ""),
    requestedBy: String(f.requestedBy ?? ""),
    approvedBy: f.approvedBy ? String(f.approvedBy) : undefined,
    approvedAt: f.approvedAt ? String(f.approvedAt) : undefined,
    rejectionReason: f.rejectionReason
      ? String(f.rejectionReason)
      : undefined,
    bypassJustification: f.bypassJustification
      ? String(f.bypassJustification)
      : undefined,
    linkedArtifactId: f.linkedArtifactId
      ? String(f.linkedArtifactId)
      : undefined,
    runId: f.runId ? String(f.runId) : undefined,
  };
}

/**
 * Map a raw fixture object to a `ValidationResultDto`.
 * Note: `findingCount` is computed on-the-fly by the domain query.
 */
export function mapFixtureToValidationResultDto(
  fixture: unknown,
): Omit<ValidationResultDto, "findingCount"> {
  const f = fixture as Record<string, unknown>;
  return {
    resultId: String(f.resultId ?? ""),
    targetId: String(f.targetId ?? ""),
    status: (f.status as ValidationResultDto["status"]) ?? "inconclusive",
    executedAt: String(f.executedAt ?? ""),
    executedBy: String(f.executedBy ?? ""),
    testPlanId: f.testPlanId ? String(f.testPlanId) : undefined,
    hypothesisId: f.hypothesisId ? String(f.hypothesisId) : undefined,
    summary: f.summary ? String(f.summary) : undefined,
    evidenceRefs: f.evidenceRefs as string[] | undefined,
    runId: f.runId ? String(f.runId) : undefined,
    metadata: f.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Map a raw fixture object to a `FindingDto`.
 */
export function mapFixtureToFindingDto(fixture: unknown): FindingDto {
  const f = fixture as Record<string, unknown>;
  return {
    findingId: String(f.findingId ?? ""),
    targetId: String(f.targetId ?? ""),
    title: String(f.title ?? ""),
    description: String(f.description ?? ""),
    severity: (f.severity as FindingDto["severity"]) ?? "low",
    status: (f.status as FindingDto["status"]) ?? "observed",
    createdAt: String(f.createdAt ?? ""),
    category: f.category as FindingDto["category"] | undefined,
    evidence: f.evidence ? String(f.evidence) : undefined,
    remediationHint: f.remediationHint
      ? String(f.remediationHint)
      : undefined,
    affectedAssets: f.affectedAssets as string[] | undefined,
    confidence: f.confidence as FindingDto["confidence"] | undefined,
    cweId: f.cweId ? String(f.cweId) : undefined,
    cvssScore: f.cvssScore !== undefined ? Number(f.cvssScore) : undefined,
    validationResultId: f.validationResultId
      ? String(f.validationResultId)
      : undefined,
    reportReady: f.reportReady !== undefined ? Boolean(f.reportReady) : undefined,
    runId: f.runId ? String(f.runId) : undefined,
  };
}

/**
 * Map a raw fixture object to an `AuditEventDto`.
 */
export function mapFixtureToAuditEventDto(
  fixture: unknown,
): AuditEventDto {
  const f = fixture as Record<string, unknown>;
  return {
    eventId: String(f.eventId ?? ""),
    targetId: String(f.targetId ?? ""),
    eventType: String(f.eventType ?? ""),
    actor: String(f.actor ?? ""),
    timestamp: String(f.timestamp ?? ""),
    runId: f.runId ? String(f.runId) : undefined,
    details: f.details as Record<string, unknown> | undefined,
    ipAddress: f.ipAddress ? String(f.ipAddress) : undefined,
    userAgent: f.userAgent ? String(f.userAgent) : undefined,
  };
}

/**
 * Map a raw fixture object to a `ReportArtifactDto`.
 */
export function mapFixtureToReportArtifactDto(
  fixture: unknown,
): ReportArtifactDto {
  const f = fixture as Record<string, unknown>;
  return {
    artifactId: String(f.artifactId ?? ""),
    targetId: String(f.targetId ?? ""),
    variant: (f.variant as ReportArtifactDto["variant"]) ?? "technical",
    title: String(f.title ?? ""),
    generatedAt: String(f.generatedAt ?? ""),
    status: (f.status as ReportArtifactDto["status"]) ?? "pending",
    findings: f.findings as string[] ?? [],
    sections: f.sections as ReportArtifactDto["sections"] | undefined,
    pdf: f.pdf as ReportArtifactDto["pdf"] | undefined,
    generatedBy: f.generatedBy as ReportArtifactDto["generatedBy"] | undefined,
    runId: f.runId ? String(f.runId) : undefined,
    metadata: f.metadata as Record<string, unknown> | undefined,
  };
}
