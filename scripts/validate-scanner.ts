import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import municipalities from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import {
  municipalitySchema,
  rawScanEvidenceSchema,
} from "../src/shared/contracts.ts";
import { exportScanFixture } from "../src/scanner/fixtures.ts";
import {
  ADMIN_EXPOSURE_PATHS,
  DEFAULT_SCANNER_CONTROLS,
  resolveScannerControls,
  scanMunicipalities,
  scanWebsite,
} from "../src/scanner/passive.ts";

const scannedAt = "2026-01-01T00:00:00.000Z";
const allowedAdminPaths = new Set<string>(ADMIN_EXPOSURE_PATHS);
const resolvePublicHostname = async () => ["93.184.216.34"];

assert.deepEqual(DEFAULT_SCANNER_CONTROLS, {
  timeoutMs: 5000,
  retries: 1,
  delayMs: 250,
});
assert.deepEqual(resolveScannerControls({ timeoutMs: 750 }), {
  timeoutMs: 750,
  retries: 1,
  delayMs: 250,
});

function makeResponse(
  body: string,
  init: {
    status?: number;
    url?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const response = new Response(body, {
    status: init.status ?? 200,
    headers: init.headers ?? {},
  });
  Object.defineProperty(response, "url", {
    value: init.url ?? "https://example.test/",
  });
  return response;
}

let fetchCalls = 0;
let delayCalls = 0;
const requestedUrls: Array<{
  method: string | undefined;
  path: string;
  search: string;
  body: BodyInit | null | undefined;
  credentials: RequestCredentials | undefined;
}> = [];
const requestedAdminPaths: Array<{
  method: string | undefined;
  path: string;
  search: string;
  body: BodyInit | null | undefined;
  credentials: RequestCredentials | undefined;
}> = [];

const evidence = await scanWebsite(
  {
    id: "mx-yuc-merida",
    name: "Merida",
    state: "Yucatan",
    websiteUrl: "https://www.merida.gob.mx",
    riskTier: "medium",
  },
  {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async (input, init) => {
      fetchCalls += 1;
      const requestUrl = new URL(
        input instanceof URL ? input.toString() : String(input),
      );
      requestedUrls.push({
        method: init?.method,
        path: requestUrl.pathname,
        search: requestUrl.search,
        body: init?.body,
        credentials: init?.credentials,
      });

      if (requestUrl.pathname !== "/") {
        requestedAdminPaths.push({
          method: init?.method,
          path: requestUrl.pathname,
          search: requestUrl.search,
          body: init?.body,
          credentials: init?.credentials,
        });
        if (requestUrl.pathname === "/wp-admin/") {
          return makeResponse("", {
            status: 405,
            url: "https://www.merida.gob.mx/wp-admin/",
          });
        }
        return makeResponse("", {
          status: requestUrl.pathname === "/wp-login.php" ? 200 : 404,
          url: `https://www.merida.gob.mx${requestUrl.pathname}`,
        });
      }

      return makeResponse(
        '<html><head><meta name="generator" content="WordPress 6.4"></head><body>/wp-content/</body></html>',
        {
          status: 200,
          url: "https://www.merida.gob.mx/",
          headers: {
            server: "fixture-server",
            "x-powered-by": "PHP/8.2",
            "content-type": "text/html; charset=utf-8",
            "x-frame-options": "SAMEORIGIN",
            "set-cookie": "do-not-store",
          },
        },
      );
    },
    getTlsCertificate: async () => ({
      valid: true,
      expiresAt: "2026-06-01T00:00:00.000Z",
      issuer: "Fixture CA",
    }),
    delay: async () => {
      delayCalls += 1;
    },
    controls: { timeoutMs: 500, retries: 1, delayMs: 5 },
  },
);

rawScanEvidenceSchema.parse(evidence);
assert.equal(evidence.reachable, true);
assert.equal(evidence.finalUrl, "https://www.merida.gob.mx/");
assert.equal(evidence.httpStatus, 200);
assert.deepEqual(Object.keys(evidence.headers).sort(), [
  "content-type",
  "server",
  "x-frame-options",
  "x-powered-by",
]);
assert.equal(evidence.cms?.name, "wordpress");
assert.equal(evidence.cms?.version, "6.4");
assert.equal(evidence.tls?.valid, true);
assert.equal(fetchCalls, 7);
assert.equal(delayCalls, 0);
assert.deepEqual(
  evidence.adminExposure.map((entry) => entry.path),
  ["/wp-login.php", "/wp-admin/", "/administrator/", "/admin/", "/user/login"],
);
assert.equal(
  evidence.adminExposure.find((entry) => entry.path === "/wp-login.php")
    ?.reachable,
  true,
);
assert.equal(
  evidence.adminExposure.find((entry) => entry.path === "/wp-login.php")
    ?.method,
  "HEAD",
);
assert.equal(
  evidence.adminExposure.find((entry) => entry.path === "/wp-admin/")?.method,
  "GET",
);
assert.deepEqual(
  evidence.adminExposure.map((entry) => entry.path),
  [...ADMIN_EXPOSURE_PATHS],
);
assert.equal(
  requestedUrls.every((request) => request.credentials === "omit"),
  true,
);
assert.equal(
  requestedAdminPaths.every(
    (request) => request.method === "HEAD" || request.method === "GET",
  ),
  true,
);
assert.equal(
  requestedAdminPaths.every((request) => allowedAdminPaths.has(request.path)),
  true,
);
assert.equal(
  requestedAdminPaths.every((request) => request.search === ""),
  true,
);
assert.equal(
  requestedAdminPaths.every((request) => request.body == null),
  true,
);
assert.equal(
  requestedAdminPaths.every((request) => request.credentials === "omit"),
  true,
);
assert.equal(
  requestedAdminPaths.some((request) => request.method === "POST"),
  false,
);
assert.equal(
  requestedAdminPaths.some((request) =>
    /password|credential|payload|exploit|brute/i.test(request.path),
  ),
  false,
);

const notFoundEvidence = await scanWebsite(
  {
    id: "mx-test-not-found",
    name: "Not Found",
    state: "Test",
    websiteUrl: "https://not-found.example.test",
    riskTier: "medium",
  },
  {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async () => makeResponse("not found", { status: 404 }),
    getTlsCertificate: async () => ({ valid: true }),
    delay: async () => undefined,
    controls: { timeoutMs: 100, retries: 0, delayMs: 1 },
  },
);

rawScanEvidenceSchema.parse(notFoundEvidence);
assert.equal(notFoundEvidence.reachable, true);
assert.equal(notFoundEvidence.httpStatus, 404);

let retryAttempts = 0;
let retryDelayCalls = 0;
let tlsRetryAttempts = 0;
const failureEvidence = await scanWebsite(
  {
    id: "mx-test-failure",
    name: "Failure",
    state: "Test",
    websiteUrl: "https://failure.example.test",
    riskTier: "high",
  },
  {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async () => {
      retryAttempts += 1;
      throw new Error("network unavailable");
    },
    getTlsCertificate: async () => {
      tlsRetryAttempts += 1;
      throw new Error("tls unavailable");
    },
    delay: async () => {
      retryDelayCalls += 1;
    },
    controls: { timeoutMs: 100, retries: 2, delayMs: 1 },
  },
);

rawScanEvidenceSchema.parse(failureEvidence);
assert.equal(failureEvidence.reachable, false);
assert.equal(
  failureEvidence.errors.some((error) => error.stage === "http"),
  true,
);
assert.equal(
  failureEvidence.errors.some((error) => error.stage === "tls"),
  true,
);
assert.equal(failureEvidence.adminExposure.length, 5);
assert.equal(
  failureEvidence.errors.some((error) => error.stage === "admin-exposure"),
  true,
);
assert.equal(retryAttempts, 18);
assert.equal(tlsRetryAttempts, 3);
assert.equal(retryDelayCalls, 14);

let blockedFetchCalls = 0;
let blockedTlsCalls = 0;
const privateResolutionEvidence = await scanWebsite(
  {
    id: "mx-private-resolution",
    name: "Private Resolution",
    state: "Test",
    websiteUrl: "https://public-looking.example.test",
    riskTier: "high",
  },
  {
    now: () => scannedAt,
    resolveHostname: async () => ["10.0.0.1"],
    fetch: async () => {
      blockedFetchCalls += 1;
      return makeResponse("should not fetch");
    },
    getTlsCertificate: async () => {
      blockedTlsCalls += 1;
      return { valid: true };
    },
    delay: async () => undefined,
    controls: { timeoutMs: 100, retries: 0, delayMs: 1 },
  },
);

rawScanEvidenceSchema.parse(privateResolutionEvidence);
assert.equal(privateResolutionEvidence.reachable, false);
assert.equal(blockedFetchCalls, 0);
assert.equal(blockedTlsCalls, 0);
assert.deepEqual(privateResolutionEvidence.adminExposure, []);
assert.equal(
  privateResolutionEvidence.errors.some(
    (error) =>
      error.stage === "dns" &&
      error.message.includes("private or internal address"),
  ),
  true,
);

const fixtureMunicipalities = municipalitySchema
  .array()
  .parse(municipalities.slice(0, 10));
const batchResults = await scanMunicipalities(fixtureMunicipalities, {
  now: () => scannedAt,
  resolveHostname: resolvePublicHostname,
  fetch: async () => makeResponse("<html><body>plain site</body></html>"),
  getTlsCertificate: async () => ({ valid: true }),
  delay: async () => undefined,
  controls: { timeoutMs: 500, retries: 0, delayMs: 1 },
});

assert.equal(batchResults.length, 10);
for (const result of batchResults) {
  rawScanEvidenceSchema.parse(result);
}

const exportDirectory = await mkdtemp(join(tmpdir(), "deff-acc-scan-fixture-"));
const exportPath = join(exportDirectory, "latest.scan-results.json");
try {
  await exportScanFixture(
    [
      {
        municipalityId: "mx-z-last",
        source: "fixture",
        requestedUrl: "https://z.example.test",
        scannedAt,
        reachable: false,
        headers: {},
        adminExposure: [],
        errors: [],
        score: 90,
        findings: [],
      },
      {
        municipalityId: "mx-a-first",
        source: "fixture",
        requestedUrl: "https://a.example.test",
        scannedAt,
        reachable: true,
        finalUrl: "https://a.example.test/",
        httpStatus: 200,
        headers: { server: "fixture" },
        adminExposure: [],
        errors: [],
      },
    ],
    exportPath,
  );

  const exported = await readFile(exportPath, "utf8");
  assert.equal(exported.endsWith("\n"), true);
  assert.equal(exported, `${JSON.stringify(JSON.parse(exported), null, 2)}\n`);

  const parsedExport = rawScanEvidenceSchema
    .array()
    .parse(JSON.parse(exported));
  assert.deepEqual(
    parsedExport.map((result) => result.municipalityId),
    ["mx-a-first", "mx-z-last"],
  );
  assert.equal("score" in parsedExport[1], false);
  assert.equal("findings" in parsedExport[1], false);
} finally {
  await rm(exportDirectory, { recursive: true, force: true });
}

console.log("Scanner validation passed.");
