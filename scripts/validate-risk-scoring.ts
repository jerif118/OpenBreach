import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { toEnrichedScanPersistenceArgs } from "../src/scanner/enrichedPersistence.ts";
import {
  enrichScanEvidence,
  enrichScanEvidenceBatch,
  riskLevelForScore,
} from "../src/scanner/risk.ts";
import {
  rawScanEvidenceSchema,
  scanResultSchema,
} from "../src/shared/contracts.ts";

assert.equal(riskLevelForScore(0), "low");
assert.equal(riskLevelForScore(24), "low");
assert.equal(riskLevelForScore(25), "medium");
assert.equal(riskLevelForScore(49), "medium");
assert.equal(riskLevelForScore(50), "high");
assert.equal(riskLevelForScore(74), "high");
assert.equal(riskLevelForScore(75), "critical");
assert.equal(riskLevelForScore(100), "critical");
assert.equal(riskLevelForScore(999), "critical");

const criticalEvidence = rawScanEvidenceSchema.parse({
  municipalityId: "mx-test-critical",
  source: "fixture",
  requestedUrl: "https://critical.example.test",
  scannedAt: "2026-01-01T00:00:00.000Z",
  reachable: true,
  finalUrl: "https://critical.example.test/",
  httpStatus: 200,
  headers: { server: "fixture" },
  tls: {
    valid: false,
    expiresAt: "2025-01-01T00:00:00.000Z",
    issuer: "Fixture CA",
  },
  cms: {
    name: "wordpress",
    version: "6.4",
    confidence: 0.8,
    evidence: ["generator:WordPress 6.4"],
  },
  adminExposure: [
    { path: "/wp-login.php", method: "HEAD", reachable: true, httpStatus: 200 },
  ],
  errors: [],
});

const criticalResult = enrichScanEvidence(criticalEvidence);
scanResultSchema.parse(criticalResult);
assert.equal(criticalResult.riskLevel, "critical");
assert.equal(criticalResult.riskScore, 100);
assert.equal(
  criticalResult.findings.some(
    (finding) => finding.category === "known-vulnerability",
  ),
  true,
);
assert.equal(
  criticalResult.findings.every((finding) => finding.evidence.length > 0),
  true,
);
assert.equal(
  criticalResult.findings.every(
    (finding) => finding.remediationHint.length > 0,
  ),
  true,
);

const lowConfidenceCms = enrichScanEvidence({
  ...criticalEvidence,
  municipalityId: "mx-test-low-confidence",
  headers: {
    "strict-transport-security": "max-age=31536000",
    "content-security-policy": "default-src 'self'",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
  },
  tls: { valid: true, expiresAt: "2027-01-01T00:00:00.000Z" },
  cms: {
    name: "wordpress",
    version: "6.4",
    confidence: 0.79,
    evidence: ["generator:WordPress 6.4"],
  },
  adminExposure: [
    {
      path: "/wp-login.php",
      method: "HEAD",
      reachable: false,
      httpStatus: 404,
    },
  ],
});
assert.equal(
  lowConfidenceCms.findings.some(
    (finding) => finding.category === "known-vulnerability",
  ),
  false,
);

const fixturePath = "data/scans/latest.enriched-scan-results.json";
const fixtureResults = scanResultSchema
  .array()
  .parse(JSON.parse(await readFile(fixturePath, "utf8")));
const levels = new Set(fixtureResults.map((result) => result.riskLevel));
assert.deepEqual([...levels].sort(), ["critical", "high", "low", "medium"]);

const rawResults = rawScanEvidenceSchema
  .array()
  .parse(
    JSON.parse(await readFile("data/scans/latest.scan-results.json", "utf8")),
  );
const persistenceArgs = toEnrichedScanPersistenceArgs(
  enrichScanEvidenceBatch(rawResults),
);
assert.equal(persistenceArgs.results.length, rawResults.length);
assert.equal(typeof persistenceArgs.results[0]?.riskScore, "number");
assert.equal(typeof persistenceArgs.results[0]?.riskLevel, "string");

console.log("Risk scoring validation passed.");
