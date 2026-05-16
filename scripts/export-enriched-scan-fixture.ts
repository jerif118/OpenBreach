import { readFile } from "node:fs/promises";
import { exportEnrichedScanFixture } from "../src/scanner/fixtures.ts";
import {
  rawScanEvidenceSchema,
  type RawScanEvidence,
} from "../src/shared/contracts.ts";

const inputPath = process.argv[2] ?? "data/scans/latest.scan-results.json";
const outputPath =
  process.argv[3] ?? "data/scans/latest.enriched-scan-results.json";
const rawResults = withDemoRiskCoverage(
  rawScanEvidenceSchema
    .array()
    .parse(JSON.parse(await readFile(inputPath, "utf8"))),
);

await exportEnrichedScanFixture(rawResults, outputPath);
console.log(
  `Exported ${rawResults.length} enriched scan results to ${outputPath}`,
);

function withDemoRiskCoverage(results: RawScanEvidence[]): RawScanEvidence[] {
  return results.map((result, index) => {
    if (index === 0) {
      return {
        ...result,
        headers: {
          "strict-transport-security": "max-age=31536000",
          "content-security-policy": "default-src 'self'",
          "x-content-type-options": "nosniff",
          "x-frame-options": "SAMEORIGIN",
        },
        cms: { name: "unknown" as const, confidence: 0, evidence: [] },
        adminExposure: result.adminExposure.map((entry) => ({
          ...entry,
          reachable: false,
          httpStatus: 404,
        })),
      };
    }
    if (index === 1) {
      return {
        ...result,
        cms: { name: "unknown" as const, confidence: 0, evidence: [] },
        adminExposure: result.adminExposure.map((entry) => ({
          ...entry,
          reachable: false,
          httpStatus: 404,
        })),
      };
    }
    if (index === 2) {
      return {
        ...result,
        tls: {
          valid: false,
          expiresAt: "2025-01-01T00:00:00.000Z",
          issuer: "DEFF-ACC Fixture CA",
        },
        cms: { name: "unknown" as const, confidence: 0, evidence: [] },
        adminExposure: result.adminExposure.map((entry) => ({
          ...entry,
          reachable: false,
          httpStatus: 404,
        })),
      };
    }
    return result;
  });
}
