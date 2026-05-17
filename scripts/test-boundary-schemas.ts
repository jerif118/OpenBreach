import assert from "node:assert/strict";
import { readCliOptions } from "./report-generation-cli.ts";
import { municipalitySeedSchema } from "../src/shared/municipalitySeed.ts";
import {
  enrichedScanPersistenceArgsSchema,
  rawScanPersistenceArgsSchema,
  REPORT_GENERATION_MAX_LIMIT,
  reportGenerationArtifactSchema,
  reportGenerationCliOptionsSchema,
  reportPersistencePayloadSchema,
  scanConvexEnvironmentSchema,
  type RawScanEvidence,
  type ScanResult,
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

const tooSmallMunicipalitySeed = municipalitySeedSchema.safeParse([]);
assert.equal(tooSmallMunicipalitySeed.success, false);
assert.equal(tooSmallMunicipalitySeed.error.issues[0]?.path.length, 0);
assert.match(
  tooSmallMunicipalitySeed.error.issues[0]?.message ?? "",
  /at least 50 records/,
);

console.log("Boundary schema tests passed.");
