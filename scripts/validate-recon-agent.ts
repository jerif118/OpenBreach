import assert from "node:assert/strict";
import { authorizationScopeSchema } from "../src/shared/contracts.ts";
import {
  DEFAULT_SEMIACTIVE_PATHS,
  isHostnameInAuthorizationScope,
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
assert.equal(
  requestedUrls.some((u) => u.includes("off-scope.attacker.test")),
  false,
);

console.log("Recon agent validation passed.");
