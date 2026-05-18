import assert from "node:assert/strict";
import { TextEncoder } from "node:util";
import { authorizationScopeSchema } from "../src/shared/contracts.ts";
import {
  DEFAULT_SEMIACTIVE_PATHS,
  isHostnameInAuthorizationScope,
  rawScanEvidenceToPassiveScanEvidence,
  runScopedPassiveRecon,
} from "../src/scanner/reconAgent.ts";
import { decideTargetScope } from "../src/shared/target-scope-decision.ts";

const scannedAt = "2026-01-01T00:00:00.000Z";

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
    value: init.url ?? "https://approved.example.test/",
  });
  return response;
}

function makeStreamingResponse(
  body: string,
  init: {
    status?: number;
    url?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const encoded = new TextEncoder().encode(body);
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    }),
    {
      status: init.status ?? 200,
      headers: init.headers ?? {},
    },
  );
  Object.defineProperty(response, "url", {
    value: init.url ?? "https://approved.example.test/",
  });
  Object.defineProperty(response, "text", {
    value: () => {
      throw new Error("bounded artifacts must not call response.text()");
    },
  });
  return response;
}

const resolvePublicHostname = async () => ["93.184.216.34"];

const authorization = authorizationScopeSchema.parse({
  authorizationId: "auth-fixture-67",
  targetId: "target-demo-generic",
  scopeType: "passive-only",
  grantedBy: "fixture-operator",
  grantedAt: "2026-01-01T00:00:00.000Z",
});

const primaryUrl = "https://approved.example.test/";
const scopeDecision = decideTargetScope({
  primaryUrl,
  allowedAssets: [primaryUrl, "approved.example.test"],
  validationLevel: "passive",
});

assert.equal(scopeDecision.status, "accepted");
if (scopeDecision.status !== "accepted") {
  throw new Error("fixture scope decision must be accepted");
}

assert.equal(
  isHostnameInAuthorizationScope("approved.example.test", scopeDecision),
  true,
);
assert.equal(
  isHostnameInAuthorizationScope("off-scope.attacker.test", scopeDecision),
  false,
);

const requestedUrls: string[] = [];
const delays: number[] = [];

const ok = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: primaryUrl,
  ids: {
    evidenceId: "ev-67-fixture",
    envelopeId: "env-67-fixture",
    runId: "run-67-fixture",
  },
  semiactivePaths: [...DEFAULT_SEMIACTIVE_PATHS],
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    controls: { timeoutMs: 500, retries: 1, delayMs: 1 },
    delay: async (milliseconds) => {
      delays.push(milliseconds);
    },
    fetch: async (input) => {
      const requestUrl = new URL(
        input instanceof URL ? input.toString() : String(input),
      );
      requestedUrls.push(requestUrl.toString());
      if (
        requestUrl.pathname === "/" &&
        requestUrl.hostname === "approved.example.test"
      ) {
        return makeResponse(
          "<html><head><title>ok</title></head><body></body></html>",
          {
            status: 200,
            url: "https://approved.example.test/",
            headers: { "content-type": "text/html" },
          },
        );
      }
      if (requestUrl.pathname === "/robots.txt") {
        return makeResponse("User-agent: *\nDisallow:\n", {
          status: 200,
          url: "https://approved.example.test/robots.txt",
        });
      }
      if (requestUrl.pathname === "/sitemap.xml") {
        return makeResponse('<?xml version="1.0"?><urlset></urlset>', {
          status: 200,
          url: "https://approved.example.test/sitemap.xml",
        });
      }
      if (
        requestUrl.pathname === "/wp-login.php" ||
        requestUrl.pathname === "/wp-admin/"
      ) {
        return makeResponse("", {
          status: requestUrl.pathname === "/wp-admin/" ? 405 : 200,
          url: `https://approved.example.test${requestUrl.pathname}`,
        });
      }
      return makeResponse("not found", { status: 404 });
    },
    getTlsCertificate: async () => ({
      valid: true,
      expiresAt: "2027-06-01T00:00:00.000Z",
      issuer: "Fixture CA",
    }),
  },
});

assert.equal(ok.status, "ok");
if (ok.status !== "ok") {
  throw new Error("expected successful scoped recon");
}

assert.equal(ok.passive.targetId, authorization.targetId);
assert.equal(ok.passive.evidenceId, "ev-67-fixture");
assert.equal(ok.envelope.payloadType, "passive-scan");
assert.equal(
  (ok.envelope.metadata as Record<string, unknown>)?.scopeRuleRef,
  authorization.authorizationId,
);
assert.equal(
  (ok.envelope.metadata as Record<string, unknown>)?.assetId,
  authorization.targetId,
);
assert.ok(
  Array.isArray(
    (ok.envelope.metadata as Record<string, unknown>)?.semiactiveArtifacts,
  ),
);

const skipped = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: "https://off-scope.attacker.test/",
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async () => makeResponse("no"),
    getTlsCertificate: async () => ({ valid: true }),
  },
});

assert.equal(skipped.status, "skipped");
if (skipped.status !== "skipped") {
  throw new Error("expected skip for off-scope host");
}
assert.ok(String(skipped.reason).includes("scope"));

assert.ok(requestedUrls.length > 0);
assert.deepEqual(delays, [1]);
assert.equal(
  requestedUrls.some((u) => u.includes("off-scope.attacker.test")),
  false,
);

const httpsSkipped = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: "http://approved.example.test/",
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async () => makeResponse("no"),
    getTlsCertificate: async () => ({ valid: true }),
  },
});

assert.equal(httpsSkipped.status, "skipped");
assert.match(httpsSkipped.reason, /HTTPS/);

const invalidUrlSkipped = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: "not a url",
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async () => makeResponse("no"),
    getTlsCertificate: async () => ({ valid: true }),
  },
});

assert.equal(invalidUrlSkipped.status, "skipped");
assert.match(invalidUrlSkipped.reason, /valid URL/);

const redirectedUrls: string[] = [];
const redirected = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: primaryUrl,
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async (input) => {
      const requestUrl = new URL(
        input instanceof URL ? input.toString() : String(input),
      );
      redirectedUrls.push(requestUrl.toString());
      return makeResponse("redirected", {
        status: 200,
        url: "https://off-scope.attacker.test/landing",
      });
    },
    getTlsCertificate: async () => ({ valid: true }),
  },
});

assert.equal(redirected.status, "skipped");
assert.match(redirected.reason, /scope/);
assert.equal(
  redirectedUrls.some((u) => u.includes("off-scope.attacker.test")),
  false,
);

const boundedPathUrls: string[] = [];
const boundedPathRejected = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: primaryUrl,
  semiactivePaths: ["//off-scope.attacker.test/robots.txt"],
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async (input) => {
      const requestUrl = new URL(
        input instanceof URL ? input.toString() : String(input),
      );
      boundedPathUrls.push(requestUrl.toString());
      return makeResponse("ok", { url: requestUrl.toString() });
    },
    getTlsCertificate: async () => ({ valid: true }),
  },
});

assert.equal(boundedPathRejected.status, "ok");
assert.equal(boundedPathRejected.boundedArtifacts.length, 0);
assert.ok(
  boundedPathRejected.passive.errors?.some((error) =>
    error.message.includes("root-relative"),
  ),
);
assert.equal(
  boundedPathUrls.some((u) => u.includes("off-scope.attacker.test")),
  false,
);

const largeArtifactBody = `${"x".repeat(4096)}extra`;
const truncated = await runScopedPassiveRecon({
  authorization,
  scopeDecision,
  requestedUrl: primaryUrl,
  semiactivePaths: ["/robots.txt"],
  options: {
    now: () => scannedAt,
    resolveHostname: resolvePublicHostname,
    fetch: async (input) => {
      const requestUrl = new URL(
        input instanceof URL ? input.toString() : String(input),
      );
      if (requestUrl.pathname === "/robots.txt") {
        return makeStreamingResponse(largeArtifactBody, {
          url: "https://approved.example.test/robots.txt",
        });
      }
      return makeResponse("ok", { url: requestUrl.toString() });
    },
    getTlsCertificate: async () => ({ valid: true }),
  },
});

assert.equal(truncated.status, "ok");
if (truncated.status !== "ok") {
  throw new Error("expected successful bounded artifact truncation validation");
}
assert.equal(truncated.boundedArtifacts[0]?.snippet?.length, 4097);
assert.equal(truncated.boundedArtifacts[0]?.snippet?.endsWith("…"), true);

const passive = rawScanEvidenceToPassiveScanEvidence(
  {
    municipalityId: "m1",
    source: "convex",
    requestedUrl: primaryUrl,
    scannedAt,
    reachable: true,
    httpStatus: 200,
    headers: {},
    adminExposure: [],
    errors: [],
  },
  { evidenceId: "ev-source", targetId: authorization.targetId },
);

assert.equal(passive.source, "convex");

console.log("Recon agent validation passed.");
