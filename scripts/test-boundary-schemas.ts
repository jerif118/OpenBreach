import assert from "node:assert/strict";
import { readCliOptions } from "./report-generation-cli.ts";
import { municipalitySeedSchema } from "../src/shared/municipalitySeed.ts";
import {
  approvalGateSchema,
  auditEventSchema,
  authorizationScopeSchema,
  evidenceEnvelopeSchema,
  enrichedScanPersistenceArgsSchema,
  findingSchema,
  passiveScanEvidenceSchema,
  rawScanPersistenceArgsSchema,
  reportArtifactSchema,
  reportGenerationArtifactSchema,
  reportGenerationCliOptionsSchema,
  reportPersistencePayloadSchema,
  scanConvexEnvironmentSchema,
  targetProfileSchema,
  technologyFingerprintSchema,
  testPlanSchema,
  validationResultSchema,
  vulnerabilityHypothesisSchema,
  workflowRunSchema,
  type ApprovalGate,
  type AuditEvent,
  type AuthorizationScope,
  type EvidenceEnvelope,
  type Finding,
  type PassiveScanEvidence,
  type RawScanEvidence,
  type ReportArtifact,
  type ScanResult,
  type TargetProfile,
  type TechnologyFingerprint,
  type TestPlan,
  type ValidationResult,
  type VulnerabilityHypothesis,
  type WorkflowRun,
} from "../src/shared/contracts.ts";

const scannedAt = "2026-01-01T00:00:00.000Z";

const rawEvidence: RawScanEvidence = {
  municipalityId: "mx-yuc-merida",
  source: "fixture",
  requestedUrl: "https://merida.gob.mx",
  scannedAt,
  reachable: true,
  finalUrl: "https://merida.gob.mx/",
  httpStatus: 200,
  headers: { server: "nginx" },
  tls: { valid: true, issuer: "Let's Encrypt" },
  cms: { name: "wordpress", version: "6.4", confidence: 0.85, evidence: [] },
  adminExposure: [],
  errors: [],
};

const scanResult: ScanResult = {
  id: "scan-mx-yuc-merida-2026-01-01",
  municipalityId: "mx-yuc-merida",
  scannedAt,
  requestedUrl: "https://merida.gob.mx",
  finalUrl: "https://merida.gob.mx/",
  reachable: true,
  httpStatus: 200,
  headers: { server: "nginx" },
  adminExposure: [],
  errors: [],
  riskScore: 25,
  riskLevel: "medium",
  findings: [],
  score: 25,
};

const persistenceFinding = {
  id: "finding-header-missing-hsts",
  category: "headers" as const,
  severity: "medium" as const,
  title: "Missing HTTP Strict Transport Security",
  description: "The response did not include HSTS.",
  evidence: "strict-transport-security was missing.",
  remediationHint: "Enable HSTS after validating HTTPS.",
  confidence: "medium" as const,
  status: "observed" as const,
  affectedAssets: [],
  evidenceSummary: "Header was missing.",
  remediationSteps: ["Add the header."],
  verificationSteps: ["Re-scan the response."],
};

const pdf = {
  storagePath: "data/reports/mx-yuc-merida-technical.pdf",
  fileName: "mx-yuc-merida-technical.pdf",
  contentType: "application/pdf" as const,
  generatedAt: scannedAt,
};

const artifacts = {
  technical: {
    variant: "technical" as const,
    label: "Technical report PDF",
    pdf,
  },
};

const reportPersistenceArgs = {
  externalId: "report-mx-yuc-merida",
  municipalityExternalId: "mx-yuc-merida",
  scanResultExternalId: scanResult.id,
  status: "completed" as const,
  generatedAt: scannedAt,
  summary: "Prioritize baseline web controls.",
  priorityActions: ["Enable HSTS."],
  findings: [persistenceFinding],
  generatedBy: "deterministic-fallback" as const,
  pdf,
  artifacts,
};

const parsedRawPersistenceArgs = rawScanPersistenceArgsSchema.parse({
  results: [
    {
      municipalityExternalId: rawEvidence.municipalityId,
      source: rawEvidence.source,
      requestedUrl: rawEvidence.requestedUrl,
      scannedAt: rawEvidence.scannedAt,
      reachable: rawEvidence.reachable,
      finalUrl: rawEvidence.finalUrl,
      httpStatus: rawEvidence.httpStatus,
      headers: rawEvidence.headers,
      tls: rawEvidence.tls,
      cms: rawEvidence.cms,
      adminExposure: rawEvidence.adminExposure ?? [],
      errors: rawEvidence.errors ?? [],
    },
  ],
});
assert.equal(
  parsedRawPersistenceArgs.results[0]?.municipalityExternalId,
  "mx-yuc-merida",
);

const invalidRawPersistenceArgs = rawScanPersistenceArgsSchema.safeParse({
  results: [{ source: "fixture" }],
});
assert.equal(invalidRawPersistenceArgs.success, false);

assert.equal(
  enrichedScanPersistenceArgsSchema.safeParse({
    results: [{ ...scanResult, municipalityExternalId: scanResult.municipalityId }],
  }).success,
  true,
);

assert.equal(
  reportPersistencePayloadSchema.safeParse({ results: [reportPersistenceArgs] })
    .success,
  true,
);

assert.equal(
  reportGenerationArtifactSchema.safeParse({
    id: "latest-report-generation",
    generatedAt: scannedAt,
    provider: "deterministic-fallback",
    selected: [],
    batch: {
      id: "latest-report-generation",
      generatedAt: scannedAt,
      provider: "deterministic-fallback",
      summary: { requested: 0, completed: 0, failed: 0 },
      results: [],
    },
    convexPersistenceArgs: [reportPersistenceArgs],
    persistence: {
      argsCommand: "pnpm report:persist:args",
      liveConvexCommand: "convex run reports:persistGenerated '<args>'",
      note: "Fixture payloads need live IDs before production persistence.",
    },
  }).success,
  true,
);

const parsedCliOptions = reportGenerationCliOptionsSchema.parse({
  generatedAt: scannedAt,
  limit: 10,
  outputPath: "data/reports/latest.report-generation.json",
});
assert.deepEqual(parsedCliOptions, {
  generatedAt: scannedAt,
  limit: 10,
  outputPath: "data/reports/latest.report-generation.json",
});

assert.equal(readCliOptions(["--limit", "10.0"]).limit, 10);
assert.equal(readCliOptions(["--limit", "1e1"]).limit, 10);

const invalidCliOptions = reportGenerationCliOptionsSchema.safeParse({
  generatedAt: "not-a-date",
  limit: 0,
  outputPath: "",
});
assert.equal(invalidCliOptions.success, false);

assert.equal(
  scanConvexEnvironmentSchema.safeParse({
    fromFixture: false,
    fixturePath: "data/scans/latest.scan-results.json",
    municipalityIds: ["mx-yuc-merida"],
    concurrency: 5,
    controls: { timeoutMs: 5000, retries: 1, delayMs: 250 },
  }).success,
  true,
);

const invalidNonFiniteEnvironment = scanConvexEnvironmentSchema.safeParse({
  fromFixture: false,
  fixturePath: "data/scans/latest.scan-results.json",
  municipalityIds: [],
  concurrency: Number.POSITIVE_INFINITY,
  controls: {
    timeoutMs: Number.POSITIVE_INFINITY,
    retries: 1,
    delayMs: Number.NEGATIVE_INFINITY,
  },
});
assert.equal(invalidNonFiniteEnvironment.success, false);

const targetProfile: TargetProfile = {
  targetId: "target-mx-yuc-merida",
  name: "Municipio de Merida",
  primaryUrl: "https://merida.gob.mx",
  riskTier: "medium",
  classification: "public-sector",
  population: 995129,
  geography: { country: "Mexico", region: "Yucatan", city: "Merida" },
};

assert.equal(targetProfileSchema.safeParse(targetProfile).success, true);

const invalidTargetProfile = targetProfileSchema.safeParse({
  name: "Example Public Services",
  primaryUrl: "https://www.example.org/",
});
assert.equal(invalidTargetProfile.success, false);

const authorizationScope: AuthorizationScope = {
  authorizationId: "auth-mx-yuc-merida",
  targetId: targetProfile.targetId,
  scopeType: "passive-only",
  grantedBy: "City Program Owner",
  grantedAt: scannedAt,
  constraints: ["Passive validation only."],
  evidenceUrl: targetProfile.primaryUrl,
};

const workflowRun: WorkflowRun = {
  runId: "run-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  status: "pending",
  startedAt: scannedAt,
};

const passiveEvidence: PassiveScanEvidence = {
  evidenceId: "evidence-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  source: "fixture",
  collectedAt: scannedAt,
  requestedUrl: targetProfile.primaryUrl,
  reachable: true,
};

const fingerprint: TechnologyFingerprint = {
  fingerprintId: "fingerprint-mx-yuc-merida-wp",
  targetId: targetProfile.targetId,
  technology: "WordPress",
  category: "cms",
  confidence: 0.85,
  detectedAt: scannedAt,
};

const hypothesis: VulnerabilityHypothesis = {
  hypothesisId: "hypothesis-mx-yuc-merida-headers",
  targetId: targetProfile.targetId,
  title: "Header hardening review",
  status: "hypothesis",
  createdAt: scannedAt,
  proposedBy: "operator",
};

const testPlan: TestPlan = {
  planId: "plan-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  title: "Passive header review",
  status: "draft",
  createdAt: scannedAt,
  steps: [{ stepId: "step-1", description: "Review headers" }],
};

const approvalGate: ApprovalGate = {
  gateId: "gate-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  gateType: "intake",
  status: "pending",
  requestedAt: scannedAt,
  requestedBy: "operator",
};

const validationResult: ValidationResult = {
  resultId: "validation-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  status: "passed",
  executedAt: scannedAt,
  executedBy: "operator",
};

const finding: Finding = {
  findingId: "finding-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  title: "Missing security headers",
  description: "HSTS header is not set",
  severity: "medium",
  status: "observed",
  createdAt: scannedAt,
};

const reportArtifact: ReportArtifact = {
  artifactId: "artifact-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  variant: "technical",
  title: "Technical Remediation Report",
  generatedAt: scannedAt,
  status: "pending",
};

const auditEvent: AuditEvent = {
  eventId: "audit-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  eventType: "target-created",
  actor: "operator",
  timestamp: scannedAt,
};

assert.equal(targetProfileSchema.safeParse(targetProfile).success, true);
assert.equal(authorizationScopeSchema.safeParse(authorizationScope).success, true);
assert.equal(workflowRunSchema.safeParse(workflowRun).success, true);
assert.equal(passiveScanEvidenceSchema.safeParse(passiveEvidence).success, true);
assert.equal(technologyFingerprintSchema.safeParse(fingerprint).success, true);
assert.equal(vulnerabilityHypothesisSchema.safeParse(hypothesis).success, true);
assert.equal(testPlanSchema.safeParse(testPlan).success, true);
assert.equal(approvalGateSchema.safeParse(approvalGate).success, true);
assert.equal(validationResultSchema.safeParse(validationResult).success, true);
assert.equal(findingSchema.safeParse(finding).success, true);
assert.equal(reportArtifactSchema.safeParse(reportArtifact).success, true);
assert.equal(auditEventSchema.safeParse(auditEvent).success, true);

assert.equal(
  technologyFingerprintSchema.safeParse({
    ...fingerprint,
    detectedAt: "not-a-date",
  }).success,
  false,
);

assert.equal(
  findingSchema.safeParse({ ...finding, extraField: "not allowed" }).success,
  false,
);

const tooSmallMunicipalitySeed = municipalitySeedSchema.safeParse([]);
assert.equal(tooSmallMunicipalitySeed.success, false);

console.log("Boundary schema tests passed.");