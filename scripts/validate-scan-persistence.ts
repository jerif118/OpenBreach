import assert from "node:assert/strict";
import {
  rawScanEvidenceSchema,
  type RawScanEvidence,
} from "../src/shared/contracts.ts";
import { toRawScanPersistenceArgs } from "../src/scanner/persistence.ts";

const rawEvidence: RawScanEvidence = rawScanEvidenceSchema.parse({
  municipalityId: "mx-yuc-merida",
  source: "fixture",
  requestedUrl: "https://www.merida.gob.mx",
  scannedAt: "2026-01-01T00:00:00.000Z",
  reachable: true,
  finalUrl: "https://www.merida.gob.mx/",
  httpStatus: 200,
  headers: {
    server: "fixture-server",
    "content-type": "text/html",
  },
  tls: {
    valid: true,
    expiresAt: "2026-06-01T00:00:00.000Z",
    issuer: "Fixture CA",
  },
  cms: {
    name: "wordpress",
    version: "6.4",
    confidence: 0.8,
    evidence: ["generator:WordPress 6.4"],
  },
  adminExposure: [
    {
      path: "/wp-login.php",
      method: "HEAD",
      reachable: true,
      httpStatus: 200,
      finalUrl: "https://www.merida.gob.mx/wp-login.php",
    },
  ],
  errors: [],
});

const args = toRawScanPersistenceArgs([rawEvidence]);

assert.equal(args.results.length, 1);
assert.equal(args.results[0]?.municipalityExternalId, "mx-yuc-merida");
assert.equal(args.results[0]?.source, "fixture");
assert.equal(args.results[0]?.reachable, true);
assert.deepEqual(args.results[0]?.headers, rawEvidence.headers);
assert.deepEqual(args.results[0]?.adminExposure, rawEvidence.adminExposure);

assert.equal("score" in args.results[0]!, false);
assert.equal("findings" in args.results[0]!, false);
assert.equal("riskScore" in args.results[0]!, false);
assert.equal("riskLevel" in args.results[0]!, false);

console.log("Scan persistence validation passed.");
