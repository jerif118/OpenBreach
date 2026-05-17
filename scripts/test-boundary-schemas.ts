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
    results: [
      { ...scanResult, municipalityExternalId: scanResult.municipalityId },
    ],
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
assert.deepEqual(
  invalidNonFiniteEnvironment.error.issues
    .map((issue) => issue.path.join("."))
    .sort(),
  ["concurrency", "controls.delayMs", "controls.timeoutMs"],
);

assert.equal(
  scanConvexEnvironmentSchema.safeParse({
    fromFixture: false,
    fixturePath: "",
    municipalityIds: [],
    concurrency: 0,
    controls: { timeoutMs: -1, retries: -1, delayMs: -1 },
  }).success,
  false,
);

const assetId = "asset-example-public-site";

const targetProfile: TargetProfile = {
  targetId: "target-example-public-site",
  name: "Example Public Services",
  primaryUrl: "https://www.example.org/",
  riskTier: "low",
  classification: "public-sector",
  population: 1000,
  metadata: { assets: [assetId] },
};

assert.equal(targetProfileSchema.safeParse(targetProfile).success, true);

const invalidTargetProfile = targetProfileSchema.safeParse({
  name: "Example Public Services",
  primaryUrl: "https://www.example.org/",
  riskTier: "low",
  classification: "public-sector",
});
assert.equal(invalidTargetProfile.success, false);
assert.deepEqual(
  invalidTargetProfile.error.issues.map((issue) => issue.path.join(".")),
  ["targetId"],
);

assert.equal(
  targetProfileSchema.safeParse({
    ...targetProfile,
    primaryUrl: "http://example.org/",
  }).success,
  false,
);

const authorizationScope: AuthorizationScope = {
  authorizationId: "auth-example-approved",
  targetId: targetProfile.targetId,
  scopeType: "passive-only",
  grantedBy: "example-authority",
  grantedAt: scannedAt,
  constraints: ["Passive validation only for this boundary test."],
};

const workflowRun: WorkflowRun = {
  runId: "workflow-example-run",
  targetId: targetProfile.targetId,
  status: "running",
  startedAt: scannedAt,
  currentPhase: "passive-scan",
};

const passiveEvidence: PassiveScanEvidence = {
  evidenceId: "evidence-example-main-page",
  targetId: targetProfile.targetId,
  source: "fixture",
  collectedAt: scannedAt,
  requestedUrl: targetProfile.primaryUrl,
  reachable: true,
  httpStatus: 200,
  headers: { server: "fixture" },
  runId: workflowRun.runId,
};

const fingerprint: TechnologyFingerprint = {
  fingerprintId: "fingerprint-mx-yuc-merida-wp",
  targetId: targetProfile.targetId,
  technology: "Example Web Server",
  category: "server",
  confidence: 0.8,
  detectedAt: scannedAt,
  evidence: [passiveEvidence.evidenceId],
  runId: workflowRun.runId,
};

const hypothesis: VulnerabilityHypothesis = {
  hypothesisId: "hypothesis-mx-yuc-merida-headers",
  targetId: targetProfile.targetId,
  title: "Header hardening review",
  status: "hypothesis",
  createdAt: scannedAt,
  proposedBy: "boundary-contract-test",
  description:
    "Passive evidence suggests security header configuration should be reviewed.",
  affectedComponents: [assetId],
  runId: workflowRun.runId,
};

const testPlan: TestPlan = {
  planId: "test-plan-example-passive-review",
  targetId: targetProfile.targetId,
  hypothesisIds: [hypothesis.hypothesisId],
  title: "Passive header review",
  status: "approved",
  createdAt: scannedAt,
  steps: [
    {
      stepId: "step-passive-review",
      description: "Confirm the passive observation remains descriptive.",
    },
  ],
  approver: "example-approver",
  approvedAt: scannedAt,
  runId: workflowRun.runId,
};

const approvalGate: ApprovalGate = {
  gateId: "approval-example-passive-review",
  targetId: targetProfile.targetId,
  gateType: "test-plan",
  status: "approved",
  requestedAt: scannedAt,
  requestedBy: "boundary-contract-test",
  approvedBy: "example-approver",
  approvedAt: scannedAt,
  linkedArtifactId: testPlan.planId,
  runId: workflowRun.runId,
};

const validationResult: ValidationResult = {
  resultId: "validation-example-header-review",
  targetId: targetProfile.targetId,
  testPlanId: testPlan.planId,
  status: "passed",
  executedAt: scannedAt,
  executedBy: "boundary-contract-test",
  summary: "Passive validation confirmed the descriptive observation.",
  evidenceRefs: [passiveEvidence.evidenceId],
  runId: workflowRun.runId,
};

const evidenceEnvelope: EvidenceEnvelope = {
  envelopeId: "envelope-example-passive-evidence",
  targetId: targetProfile.targetId,
  source: "fixture",
  recordedAt: scannedAt,
  payloadType: "passive-scan",
  payload: passiveEvidence,
  runId: workflowRun.runId,
};

const finding: Finding = {
  findingId: "finding-mx-yuc-merida-001",
  targetId: targetProfile.targetId,
  title: "Review security header baseline",
  description: "A safe passive review identified a hardening opportunity.",
  severity: "low",
  status: "confirmed",
  createdAt: scannedAt,
  evidence: passiveEvidence.evidenceId,
  remediationHint: "Review standard security header configuration guidance.",
  affectedAssets: [assetId],
  validationResultId: validationResult.resultId,
  runId: workflowRun.runId,
};

const reportArtifact: ReportArtifact = {
  artifactId: "report-example-passive-review",
  targetId: targetProfile.targetId,
  variant: "technical",
  title: "Example passive validation report",
  generatedAt: scannedAt,
  status: "completed",
  findings: [finding.findingId],
  pdf,
  runId: workflowRun.runId,
};

const auditEvent: AuditEvent = {
  eventId: "audit-example-report-generated",
  targetId: targetProfile.targetId,
  eventType: "report-generated",
  actor: "boundary-contract-test",
  timestamp: scannedAt,
  runId: workflowRun.runId,
  details: { artifactId: reportArtifact.artifactId },
};

assert.equal(targetProfileSchema.safeParse(targetProfile).success, true);
assert.equal(
  authorizationScopeSchema.safeParse(authorizationScope).success,
  true,
);
assert.equal(workflowRunSchema.safeParse(workflowRun).success, true);
assert.equal(
  passiveScanEvidenceSchema.safeParse(passiveEvidence).success,
  true,
);
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
    evidence: [],
  }).success,
  false,
);

assert.equal(
  findingSchema.safeParse({
    ...finding,
    status: "confirmed",
    validationResultId: undefined,
  }).success,
  false,
);

const tooSmallMunicipalitySeed = municipalitySeedSchema.safeParse([]);
assert.equal(tooSmallMunicipalitySeed.success, false);

console.log("Boundary schema tests passed.");
