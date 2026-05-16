import municipalities from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import { exportScanFixture } from "../src/scanner/fixtures.ts";
import { scanMunicipalities } from "../src/scanner/passive.ts";
import { municipalitySchema } from "../src/shared/contracts.ts";

const outputPath = process.argv[2] ?? "data/scans/latest.scan-results.json";
const records = municipalitySchema.array().parse(municipalities);
const results = await scanMunicipalities(records, {
  source: "fixture",
  now: () => "2026-01-01T00:00:00.000Z",
  fetch: async (input, init) => makeFixtureResponse(input, init?.method),
  getTlsCertificate: async () => ({
    valid: true,
    expiresAt: "2026-06-01T00:00:00.000Z",
    issuer: "DEFF-ACC Fixture CA",
  }),
  delay: async () => undefined,
  controls: { timeoutMs: 500, retries: 0, delayMs: 0 },
});

await exportScanFixture(results, outputPath);
console.log(`Exported ${results.length} scan results to ${outputPath}`);

function makeFixtureResponse(input: RequestInfo | URL, method: string | undefined): Response {
  const url = new URL(input instanceof URL ? input.toString() : String(input));
  const isHomePage = url.pathname === "/" || url.pathname.length === 0;
  const status = isHomePage || url.pathname === "/wp-login.php" ? 200 : 404;
  const body = isHomePage
    ? `<html><head><meta name="generator" content="WordPress 6.4"></head><body>${url.hostname}</body></html>`
    : "";
  const response = new Response(method === "HEAD" ? null : body, {
    status,
    headers: {
      "content-type": isHomePage ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
      server: "deff-acc-fixture",
      "x-frame-options": "SAMEORIGIN",
    },
  });
  Object.defineProperty(response, "url", { value: url.toString() });
  return response;
}
