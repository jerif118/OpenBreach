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
  REPORT_GENERATION_MAX_LIMIT,
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
  requestedUrl: "https://merida.example",
  scannedAt,
  reachable: true,
  finalUrl: "https://merida.example/",
  httpStatus: 200,
  headers: { server: "fixture" },
  adminExposure: [],
  errors: [],
};

const scanResult: ScanResult = {
  id: "scan-mx-yuc-merida-2026-01-01",
  municipalityId: rawEvidence.municipalityId,
  scannedAt,
  requestedUrl: rawEvidence.requestedUrl,
  finalUrl: rawEvidence.finalUrl,
  reachable: true,
  httpStatus: 200,
  headers: rawEvidence.headers,
  adminExposure: [],
  errors: [],
  riskScore: 0,
  riskLevel: "low",
  findings: [],
  score: 0,
};

const persistenceFinding = {
  id: "finding-header-missing-hsts",
  category: "headers",
  severity: "medium",
  title: "Missing HTTP Strict Transport Security",
  description: "The response did not include HSTS.",
  evidence: "strict-transport-security was missing.",
  remediationHint: "Enable HSTS after validating HTTPS.",
  confidence: "medium",
  status: "observed",
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
    { ...rawEvidence, municipalityExternalId: rawEvidence.municipalityId },
  ],
});
assert.equal(
  parsedRawPersistenceArgs.results[0]?.municipalityExternalId,
  rawEvidence.municipalityId,
);

const invalidRawPersistenceArgs = rawScanPersistenceArgsSchema.safeParse({
  results: [{ source: "fixture" }],
});
assert.equal(invalidRawPersistenceArgs.success, false);
assert.deepEqual(
  invalidRawPersistenceArgs.error.issues
    .map((issue) => issue.path.join("."))
    .filter((path) =>
      ["results.0.municipalityExternalId", "results.0.requestedUrl"].includes(
        path,
      ),
    )
    .sort(),
  ["results.0.municipalityExternalId", "results.0.requestedUrl"],
);

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
assert.equal(readCliOptions(["--all"]).limit, REPORT_GENERATION_MAX_LIMIT);
assert.throws(
  () => readCliOptions(["--", "--limit", "5"]),
  /Unexpected positional argument/,
);

const invalidCliOptions = reportGenerationCliOptionsSchema.safeParse({
  generatedAt: "not-a-date",
  limit: 0,
  outputPath: "",
});
assert.equal(invalidCliOptions.success, false);
assert.deepEqual(
  invalidCliOptions.error.issues.map((issue) => issue.path.join(".")).sort(),
  ["generatedAt", "limit", "outputPath"],
);

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

const pivotSource = {
  type: "fixture" as const,
  name: "boundary-contract-test",
  version: "1.0.0",
};

const evidenceReference = {
  evidenceId: "evidence-example-main-page",
  description: "Passive observation from the target landing page.",
};

const targetProfile: TargetProfile = {
  targetId: "target-example-public-site",
  organizationName: "Example Public Services",
  canonicalUrl: "https://www.example.org/",
  assetIds: ["asset-example-public-site"],
  status: "approved",
  summary: "Authorized public-facing example target.",
  tags: [],
};

assert.equal(targetProfileSchema.safeParse(targetProfile).success, true);

const invalidTargetProfile = targetProfileSchema.safeParse({
  organizationName: "Example Public Services",
  canonicalUrl: "https://www.example.org/",
  assetIds: ["asset-example-public-site"],
  status: "approved",
});
assert.equal(invalidTargetProfile.success, false);
assert.deepEqual(
  invalidTargetProfile.error.issues.map((issue) => issue.path.join(".")),
  ["targetId"],
);

assert.equal(
  targetProfileSchema.safeParse({ ...targetProfile, municipalityId: "legacy" })
    .success,
  false,
);

const authorizationScope: AuthorizationScope = {
  scopeId: "scope-example-approved",
  targetId: targetProfile.targetId,
  status: "approved",
  authorizedBy: "example-authority",
  authorizedAt: scannedAt,
  startsAt: scannedAt,
  allowedAssetIds: targetProfile.assetIds,
  constraints: ["Passive validation only for this boundary test."],
};

const workflowRun: WorkflowRun = {
  workflowRunId: "workflow-example-run",
  targetId: targetProfile.targetId,
  scopeId: authorizationScope.scopeId,
  status: "approved",
  startedAt: scannedAt,
  source: pivotSource,
  summary: "Boundary test workflow run.",
};

const passiveEvidence: PassiveScanEvidence = {
  evidenceId: evidenceReference.evidenceId,
  targetId: targetProfile.targetId,
  assetId: targetProfile.assetIds[0] ?? "asset-example-public-site",
  observedAt: scannedAt,
  source: pivotSource,
  canonicalUrl: targetProfile.canonicalUrl,
  observation: "The target returned a public landing page response.",
  evidenceReferences: [],
};

const fingerprint: TechnologyFingerprint = {
  fingerprintId: "fingerprint-example-server",
  targetId: targetProfile.targetId,
  assetId: passiveEvidence.assetId,
  observedAt: scannedAt,
  source: pivotSource,
  technology: "Example Web Server",
  category: "server",
  confidence: "medium",
  evidenceReferences: [evidenceReference],
};

const hypothesis: VulnerabilityHypothesis = {
  hypothesisId: "hypothesis-example-header-hardening",
  targetId: targetProfile.targetId,
  assetId: passiveEvidence.assetId,
  createdAt: scannedAt,
  source: pivotSource,
  title: "Header hardening review",
  summary:
    "Passive evidence suggests security header configuration should be reviewed.",
  severity: "low",
  status: "hypothesis",
  confidence: "medium",
  evidenceReferences: [evidenceReference],
};

const testPlan: TestPlan = {
  testPlanId: "test-plan-example-passive-review",
  targetId: targetProfile.targetId,
  scopeId: authorizationScope.scopeId,
  hypothesisIds: [hypothesis.hypothesisId],
  status: "approved",
  createdAt: scannedAt,
  source: pivotSource,
  summary: "Review passive evidence and document safe remediation guidance.",
  validationSteps: ["Confirm the passive observation remains descriptive."],
};

const approvalGate: ApprovalGate = {
  approvalGateId: "approval-example-passive-review",
  targetId: targetProfile.targetId,
  testPlanId: testPlan.testPlanId,
  status: "approved",
  decidedAt: scannedAt,
  decidedBy: "example-approver",
  reason: "The plan stays within passive, authorized validation boundaries.",
};

const validationResult: ValidationResult = {
  validationResultId: "validation-example-header-review",
  targetId: targetProfile.targetId,
  testPlanId: testPlan.testPlanId,
  status: "confirmed",
  validatedAt: scannedAt,
  source: pivotSource,
  summary: "Passive validation confirmed the descriptive observation.",
  evidenceReferences: [evidenceReference],
};

const evidenceEnvelope: EvidenceEnvelope = {
  envelopeId: "envelope-example-passive-evidence",
  targetId: targetProfile.targetId,
  createdAt: scannedAt,
  source: pivotSource,
  summary: "Passive evidence bundle for the boundary contract test.",
  evidenceReferences: [evidenceReference],
};

const finding: Finding = {
  findingId: "finding-example-header-hardening",
  targetId: targetProfile.targetId,
  assetIds: [passiveEvidence.assetId],
  createdAt: scannedAt,
  source: pivotSource,
  title: "Review security header baseline",
  summary: "A safe passive review identified a hardening opportunity.",
  severity: "low",
  status: "confirmed",
  evidenceReferences: [evidenceReference],
  remediationGuidance:
    "Review standard security header configuration guidance.",
};

const reportArtifact: ReportArtifact = {
  reportId: "report-example-passive-review",
  targetId: targetProfile.targetId,
  generatedAt: scannedAt,
  source: pivotSource,
  status: "approved",
  audience: "technical",
  title: "Example passive validation report",
  summary: "Report-ready summary of safe passive validation findings.",
  findingIds: [finding.findingId],
  evidenceReferences: [evidenceReference],
};

const auditEvent: AuditEvent = {
  auditEventId: "audit-example-report-generated",
  targetId: targetProfile.targetId,
  occurredAt: scannedAt,
  source: pivotSource,
  actor: "boundary-contract-test",
  action: "report_generated",
  status: "confirmed",
  summary: "Generated the report artifact for the boundary contract test.",
  evidenceReferences: [evidenceReference],
};

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
assert.equal(evidenceEnvelopeSchema.safeParse(evidenceEnvelope).success, true);
assert.equal(findingSchema.safeParse(finding).success, true);
assert.equal(reportArtifactSchema.safeParse(reportArtifact).success, true);
assert.equal(auditEventSchema.safeParse(auditEvent).success, true);

assert.equal(
  technologyFingerprintSchema.safeParse({
    ...fingerprint,
    observedAt: "not-a-date",
    evidenceReferences: [],
  }).success,
  false,
);

assert.equal(
  findingSchema.safeParse({ ...finding, credentials: "not allowed" }).success,
  false,
);

const tooSmallMunicipalitySeed = municipalitySeedSchema.safeParse([]);
assert.equal(tooSmallMunicipalitySeed.success, false);
assert.equal(tooSmallMunicipalitySeed.error.issues[0]?.path.length, 0);
assert.match(
  tooSmallMunicipalitySeed.error.issues[0]?.message ?? "",
  /at least 50 records/,
);

console.log("Boundary schema tests passed.");
