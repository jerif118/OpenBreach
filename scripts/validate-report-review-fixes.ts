import assert from "node:assert/strict";

import { parseProviderReport } from "../src/ai/report-provider-parser.ts";
import { buildProviderPrompt } from "../src/ai/report-provider-prompt.ts";
import { buildDeterministicReportVariants } from "../src/reports/report-composer.ts";
import { normalizeReportInput } from "../src/reports/report-normalizer.ts";

const sharedFinding = {
  id: "shared-finding",
  title: "Unexpected object severity",
  description: "The source used an unsupported severity shape.",
  evidence: "Fixture evidence.",
  remediation: "Normalize unsupported values safely.",
  severity: { level: "unknown" },
};

const normalized = normalizeReportInput({
  sourceData: {
    target: {
      id: "normalizer-target",
      name: "Normalizer target",
      url: "https://normalizer.example.test",
    },
    results: [
      {
        title: "Controlled validation",
        status: "passed",
      },
    ],
    scan: {
      municipalityId: "normalizer-target",
      requestedUrl: "https://normalizer.example.test",
      riskScore: 5,
      riskLevel: "low",
      findings: [sharedFinding],
    },
  },
});

assert.equal(
  normalized.findings.length,
  1,
  "Source scan findings must not be collected twice when scan is derived from source.scan.",
);
assert.equal(
  normalized.findings[0]?.severity,
  "info",
  "Unsupported severity value types must normalize to info.",
);
assert.ok(
  !normalized.limitations.includes(
    "No explicit validation result set was supplied, so unresolved uncertainty remains.",
  ),
  "Validation results supplied under results must satisfy the limitation check.",
);
assert.notEqual(
  normalized.generatedAt,
  "2026-01-01T00:00:00.000Z",
  "Missing generatedAt must use a runtime timestamp, not the old fixed fallback.",
);
assert.ok(
  Number.isFinite(Date.parse(normalized.generatedAt)),
  "Runtime generatedAt fallback must still be an ISO datetime.",
);

const providerReport = buildDeterministicReportVariants(
  normalized,
  "ai-provider",
  normalized.generatedAt,
).technical;
const parsedProviderReport = parseProviderReport(
  `Provider response:\n\n\`\`\`JSON\n${JSON.stringify(providerReport)}\n\`\`\`\n\nEnd response.`,
  "technical",
);

assert.equal(
  parsedProviderReport.id,
  providerReport.id,
  "Provider parser must accept fenced JSON with surrounding model text and case-insensitive fence labels.",
);

const prompt = buildProviderPrompt(
  {
    sourceData: {
      target: {
        id: "redaction-target",
        name: "Redaction target",
        url: "https://redaction.example.test",
      },
      findings: [
        {
          title: "Sensitive raw evidence",
          description: "Raw evidence should not leave the boundary.",
          evidence: "Summarized evidence only.",
          remediation: "Send only normalized report-safe fields.",
          rawEvidence: "secret-token-123",
        },
      ],
      sourceDump: "secret-token-123",
    },
  },
  "technical",
);

assert.ok(
  !prompt.includes("secret-token-123"),
  "Provider prompt must omit raw source payload values.",
);
assert.ok(
  !prompt.includes('"sourceData"'),
  "Provider prompt must not include the raw normalized sourceData field.",
);
assert.ok(
  !prompt.includes('"raw"'),
  "Provider prompt must not include finding raw source payloads.",
);

console.log("Report review-fix validation passed.");
