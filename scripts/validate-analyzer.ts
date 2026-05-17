import { readFileSync } from "fs";
import { join } from "path";
import {
  analyzeEvidence,
  AnalyzerError,
} from "../src/scanner/analyzer/index.ts";
import {
  cmsDetectionRule,
  cmsVersionRule,
  serverHeaderRule,
  xPoweredByRule,
  generatorLibraryRule,
  cdnHeaderRule,
  missingSecurityHeadersRule,
  cmsVulnerabilityRule,
  tlsExpiryRule,
  missingHstsRule,
  missingCspRule,
  missingXFrameOptionsRule,
  adminPanelExposureRule,
} from "../src/scanner/analyzer/rules.ts";
import type { PassiveScanEvidence } from "../src/shared/contracts.ts";

const __dirname = new URL(".", import.meta.url).pathname;

function loadFixture(name: string): PassiveScanEvidence {
  const path = join(__dirname, "../src/scanner/analyzer/__fixtures__", name);
  return JSON.parse(readFileSync(path, "utf-8")) as PassiveScanEvidence;
}

function loadExpected(name: string): unknown {
  const path = join(__dirname, "../src/scanner/analyzer/__fixtures__", name);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function deterministicOptions() {
  let counter = 0;
  return {
    now: () => "2026-05-17T00:00:00.000Z",
    idGenerator: () => {
      counter++;
      return `id-${counter.toString().padStart(3, "0")}`;
    },
    confidenceThreshold: 0.6,
  };
}

let passed = 0;
let failed = 0;

function assertEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  const actualJson = JSON.stringify(actual, null, 2);
  const expectedJson = JSON.stringify(expected, null, 2);
  if (actualJson !== expectedJson) {
    console.error(`FAIL: ${message}`);
    console.error("Expected:", expectedJson);
    console.error("Actual:", actualJson);
    failed++;
  } else {
    console.log(`PASS: ${message}`);
    passed++;
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  } else {
    console.log(`PASS: ${message}`);
    passed++;
  }
}

// ── Integration Tests ──

console.log("\n=== Integration Tests ===\n");

const fixtures = [
  { evidence: "evidence-complete.json", expected: "expected-complete.json" },
  { evidence: "evidence-empty.json", expected: "expected-empty.json" },
  { evidence: "evidence-partial.json", expected: "expected-partial.json" },
  { evidence: "evidence-dedup.json", expected: "expected-dedup.json" },
];

for (const { evidence: evName, expected: exName } of fixtures) {
  const evidence = loadFixture(evName);
  const expected = loadExpected(exName);
  const result = analyzeEvidence(evidence, deterministicOptions());
  assertEqual(result, expected, `analyzeEvidence(${evName})`);
}

// ── Unit Tests: Fingerprint Rules ──

console.log("\n=== Unit Tests: Fingerprint Rules ===\n");

const baseOptions = deterministicOptions();

// Server header rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: { server: "nginx/1.18.0" },
    adminExposure: [],
    errors: [],
  };
  const result = serverHeaderRule(evidence, baseOptions);
  assertEqual(result.length, 1, "serverHeaderRule returns 1 result");
  assertEqual(result[0].technology, "nginx", "serverHeaderRule technology");
  assertEqual(result[0].category, "server", "serverHeaderRule category");
  assertEqual(result[0].confidence, 0.7, "serverHeaderRule confidence");
  assertEqual(
    result[0].evidence,
    ["header:server=nginx/1.18.0"],
    "serverHeaderRule evidence",
  );
})();

(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: { server: "unknown-server/1.0" },
    adminExposure: [],
    errors: [],
  };
  const result = serverHeaderRule(evidence, baseOptions);
  assertEqual(result.length, 1, "serverHeaderRule partial returns 1 result");
  assertEqual(
    result[0].technology,
    "unknown-server",
    "serverHeaderRule partial technology",
  );
  assertEqual(result[0].confidence, 0.5, "serverHeaderRule partial confidence");
})();

// X-Powered-By rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: { "x-powered-by": "PHP/7.4" },
    adminExposure: [],
    errors: [],
  };
  const result = xPoweredByRule(evidence, baseOptions);
  assertEqual(result.length, 1, "xPoweredByRule returns 1 result");
  assertEqual(result[0].technology, "php", "xPoweredByRule technology");
  assertEqual(result[0].category, "framework", "xPoweredByRule category");
  assertEqual(result[0].confidence, 0.6, "xPoweredByRule confidence");
})();

// CMS detection rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    cms: {
      name: "wordpress",
      version: "6.4",
      confidence: 0.8,
      evidence: ["generator"],
    },
    adminExposure: [],
    errors: [],
  };
  const result = cmsDetectionRule(evidence, baseOptions);
  assertEqual(result.length, 1, "cmsDetectionRule returns 1 result");
  assertEqual(result[0].technology, "wordpress", "cmsDetectionRule technology");
  assertEqual(result[0].category, "cms", "cmsDetectionRule category");
  assertEqual(result[0].confidence, 0.8, "cmsDetectionRule confidence");
})();

// CMS version rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    cms: {
      name: "wordpress",
      version: "6.4",
      confidence: 0.8,
      evidence: ["generator"],
    },
    adminExposure: [],
    errors: [],
  };
  const result = cmsVersionRule(evidence, baseOptions);
  assertEqual(result.length, 1, "cmsVersionRule returns 1 result");
  assertEqual(result[0].version, "6.4", "cmsVersionRule version");
  assertEqual(
    result[0].versionConfidence,
    0.8,
    "cmsVersionRule versionConfidence",
  );
})();

// Generator library rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    cms: {
      name: "wordpress",
      version: "6.4",
      confidence: 0.8,
      evidence: ["generator:wordpress"],
    },
    adminExposure: [],
    errors: [],
  };
  const result = generatorLibraryRule(evidence, baseOptions);
  assertEqual(result.length, 1, "generatorLibraryRule returns 1 result");
  assertEqual(
    result[0].technology,
    "wordpress",
    "generatorLibraryRule technology",
  );
  assertEqual(result[0].category, "library", "generatorLibraryRule category");
  assertEqual(result[0].confidence, 0.5, "generatorLibraryRule confidence");
})();

// CDN header rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: { server: "cloudflare" },
    adminExposure: [],
    errors: [],
  };
  const result = cdnHeaderRule(evidence, baseOptions);
  assertEqual(result.length, 1, "cdnHeaderRule returns 1 result");
  assertEqual(result[0].technology, "cloudflare", "cdnHeaderRule technology");
  assertEqual(result[0].category, "cdn", "cdnHeaderRule category");
  assertEqual(result[0].confidence, 0.7, "cdnHeaderRule confidence");
})();

// Missing security headers rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: { server: "nginx" },
    adminExposure: [],
    errors: [],
  };
  const result = missingSecurityHeadersRule(evidence, baseOptions);
  assertEqual(result.length, 3, "missingSecurityHeadersRule returns 3 results");
  assertTrue(
    result.every((r) => r.category === "other" && r.confidence === 0.6),
    "missingSecurityHeadersRule all have category=other and confidence=0.6",
  );
})();

// ── Unit Tests: Hypothesis Rules ──

console.log("\n=== Unit Tests: Hypothesis Rules ===\n");

// CMS vulnerability rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    cms: {
      name: "wordpress",
      version: "6.4.2",
      confidence: 0.85,
      evidence: ["generator"],
    },
    adminExposure: [],
    errors: [],
  };
  const result = cmsVulnerabilityRule(evidence, [], baseOptions);
  assertEqual(result.length, 1, "cmsVulnerabilityRule returns 1 result");
  assertEqual(
    result[0].title,
    "WordPress 6.4 requires patch review",
    "cmsVulnerabilityRule title",
  );
  assertEqual(
    result[0].affectedComponents,
    ["wordpress"],
    "cmsVulnerabilityRule affectedComponents",
  );
})();

// CMS vulnerability rule below threshold
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    cms: {
      name: "wordpress",
      version: "6.4",
      confidence: 0.7,
      evidence: ["generator"],
    },
    adminExposure: [],
    errors: [],
  };
  const result = cmsVulnerabilityRule(evidence, [], baseOptions);
  assertEqual(
    result.length,
    0,
    "cmsVulnerabilityRule returns 0 when confidence below threshold",
  );
})();

// TLS expiry rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    tls: { valid: true, expiresAt: "2026-06-10T00:00:00Z" },
    adminExposure: [],
    errors: [],
  };
  const result = tlsExpiryRule(evidence, [], {
    now: () => "2026-05-17T00:00:00Z",
    idGenerator: () => "",
    confidenceThreshold: 0.6,
  });
  assertEqual(
    result.length,
    1,
    "tlsExpiryRule returns 1 result for near expiry",
  );
  assertEqual(
    result[0].title,
    "TLS certificate nearing expiry",
    "tlsExpiryRule title",
  );
  assertEqual(
    result[0].affectedComponents,
    ["tls"],
    "tlsExpiryRule affectedComponents",
  );
})();

// Missing HSTS rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    adminExposure: [],
    errors: [],
  };
  const result = missingHstsRule(evidence, [], baseOptions);
  assertEqual(result.length, 1, "missingHstsRule returns 1 result");
  assertEqual(result[0].title, "Missing HSTS header", "missingHstsRule title");
  assertEqual(result[0].cweId, "CWE-319", "missingHstsRule cweId");
})();

// Missing CSP rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    adminExposure: [],
    errors: [],
  };
  const result = missingCspRule(evidence, [], baseOptions);
  assertEqual(result.length, 1, "missingCspRule returns 1 result");
  assertEqual(result[0].title, "Missing CSP header", "missingCspRule title");
  assertEqual(result[0].cweId, "CWE-693", "missingCspRule cweId");
})();

// Missing X-Frame-Options rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    adminExposure: [],
    errors: [],
  };
  const result = missingXFrameOptionsRule(evidence, [], baseOptions);
  assertEqual(result.length, 1, "missingXFrameOptionsRule returns 1 result");
  assertEqual(
    result[0].title,
    "Clickjacking risk: missing X-Frame-Options",
    "missingXFrameOptionsRule title",
  );
})();

// Admin panel exposure rule
(() => {
  const evidence: PassiveScanEvidence = {
    evidenceId: "test",
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: true,
    httpStatus: 200,
    headers: {},
    adminExposure: [
      { path: "/admin/", reachable: true, httpStatus: 200 },
      { path: "/login/", reachable: false },
    ],
    errors: [],
  };
  const result = adminPanelExposureRule(evidence, [], baseOptions);
  assertEqual(
    result.length,
    1,
    "adminPanelExposureRule returns 1 result for reachable only",
  );
  assertEqual(
    result[0].title,
    "Admin panel reachable at /admin/",
    "adminPanelExposureRule title",
  );
  assertEqual(
    result[0].affectedComponents,
    ["/admin/"],
    "adminPanelExposureRule affectedComponents",
  );
})();

// ── Regression Tests ──

console.log("\n=== Regression Tests ===\n");

(() => {
  const evidence = loadFixture("evidence-dedup.json");
  const result = analyzeEvidence(evidence, deterministicOptions());
  assertEqual(
    result.fingerprints.filter(
      (f) => f.technology === "wordpress" && f.category === "cms",
    ).length,
    1,
    "dedup keeps only one wordpress:cms fingerprint",
  );
  assertEqual(
    result.fingerprints[0].version,
    "6.4",
    "dedup keeps version fingerprint",
  );
})();

// ── Safety Audit ──

console.log("\n=== Safety Audit ===\n");

(() => {
  const kbPath = join(__dirname, "../src/scanner/analyzer/knowledgeBase.ts");
  const kbContent = readFileSync(kbPath, "utf-8").toLowerCase();
  const forbiddenWords = ["exploit", "payload", "shell", "reverse", "rce"];
  const found = forbiddenWords.filter((word) => kbContent.includes(word));
  assertEqual(
    found.length,
    0,
    `knowledgeBase.ts contains no forbidden words: ${found.join(", ")}`,
  );
})();

// ── Error Tests ──

console.log("\n=== Error Tests ===\n");

(() => {
  const invalidEvidence = {
    targetId: "t1",
    source: "fixture",
    collectedAt: "2026-05-17T00:00:00Z",
    requestedUrl: "https://example.com",
    reachable: false,
    headers: {},
    adminExposure: [],
    errors: [],
  } as unknown as PassiveScanEvidence;

  try {
    analyzeEvidence(invalidEvidence);
    assertTrue(false, "analyzeEvidence throws for missing evidenceId");
  } catch (error) {
    assertTrue(
      error instanceof AnalyzerError && error.code === "INVALID_EVIDENCE",
      "analyzeEvidence throws AnalyzerError with code INVALID_EVIDENCE",
    );
  }
})();

// ── Summary ──

console.log("\n=== Summary ===\n");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
