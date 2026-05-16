import { connect } from "node:tls";
import type { Municipality, RawScanEvidence } from "../shared/contracts.ts";

export type ScannerControls = {
  timeoutMs?: number;
  retries?: number;
  delayMs?: number;
};

export type TlsEvidence = NonNullable<RawScanEvidence["tls"]>;

export type PassiveScannerOptions = {
  source?: RawScanEvidence["source"];
  controls?: ScannerControls;
  fetch?: typeof fetch;
  getTlsCertificate?: (url: URL, timeoutMs: number) => Promise<TlsEvidence>;
  delay?: (milliseconds: number) => Promise<void>;
  now?: () => string;
};

export const DEFAULT_SCANNER_CONTROLS = {
  timeoutMs: 5000,
  retries: 1,
  delayMs: 250,
} satisfies Required<ScannerControls>;

const SELECTED_HEADERS = [
  "server",
  "x-powered-by",
  "content-type",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
] as const;

export const ADMIN_EXPOSURE_PATHS = [
  "/wp-login.php",
  "/wp-admin/",
  "/administrator/",
  "/admin/",
  "/user/login",
] as const;

// Passive boundary: these probes never authenticate, submit forms, or send bodies.
type SafeRequestMethod = "GET" | "HEAD";

type CmsName = NonNullable<RawScanEvidence["cms"]>["name"];

export async function scanMunicipalities(
  municipalities: readonly Municipality[],
  options: PassiveScannerOptions = {},
): Promise<RawScanEvidence[]> {
  const results: RawScanEvidence[] = [];
  const controls = resolveScannerControls(options.controls);

  for (const municipality of municipalities) {
    if (results.length > 0 && controls.delayMs > 0) {
      await (options.delay ?? delay)(controls.delayMs);
    }
    results.push(await scanWebsite(municipality, { ...options, controls }));
  }

  return results;
}

export async function scanWebsite(
  municipality: Municipality,
  options: PassiveScannerOptions = {},
): Promise<RawScanEvidence> {
  const controls = resolveScannerControls(options.controls);
  const requestedUrl = municipality.websiteUrl;
  const baseEvidence: RawScanEvidence = {
    municipalityId: municipality.id,
    source: options.source ?? "fixture",
    requestedUrl,
    scannedAt: options.now?.() ?? new Date().toISOString(),
    reachable: false,
    headers: {},
    adminExposure: [],
    errors: [],
  };

  let url: URL;
  try {
    url = new URL(requestedUrl);
  } catch (error) {
    baseEvidence.errors.push(toError("http", error));
    return baseEvidence;
  }

  const [httpEvidence, tlsEvidence] = await Promise.all([
    collectHttpEvidence(url, controls, options),
    collectTlsEvidence(url, controls, options),
  ]);
  const adminEvidence = await collectAdminExposure(url, controls, options);

  return {
    ...baseEvidence,
    ...httpEvidence,
    tls: tlsEvidence.tls,
    adminExposure: adminEvidence.adminExposure,
    errors: [...baseEvidence.errors, ...httpEvidence.errors, ...tlsEvidence.errors, ...adminEvidence.errors],
  };
}

async function collectHttpEvidence(
  url: URL,
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
): Promise<Pick<RawScanEvidence, "reachable" | "finalUrl" | "httpStatus" | "headers" | "cms" | "errors">> {
  const fetchImpl = options.fetch ?? fetch;
  const errors: RawScanEvidence["errors"] = [];

  try {
    const response = await withRetries(
      () => fetchWithTimeout(fetchImpl, url, controls.timeoutMs, "GET"),
      controls,
      options.delay ?? delay,
    );
    const body = await response.text();

    return {
      reachable: response.ok,
      finalUrl: response.url || url.toString(),
      httpStatus: response.status,
      headers: selectHeaders(response.headers),
      cms: detectCms(body, response.headers),
      errors,
    };
  } catch (error) {
    errors.push(toError("http", error));
    return {
      reachable: false,
      headers: {},
      cms: { name: "unknown", confidence: 0, evidence: [] },
      errors,
    };
  }
}

async function collectAdminExposure(
  baseUrl: URL,
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
): Promise<Pick<RawScanEvidence, "adminExposure" | "errors">> {
  const fetchImpl = options.fetch ?? fetch;
  const errors: RawScanEvidence["errors"] = [];
  const adminExposure: RawScanEvidence["adminExposure"] = [];

  for (const path of ADMIN_EXPOSURE_PATHS) {
    const checkUrl = new URL(path, baseUrl.origin);
    try {
      const headResponse = await withRetries(
        () => fetchWithTimeout(fetchImpl, checkUrl, controls.timeoutMs, "HEAD"),
        controls,
        options.delay ?? delay,
      );
      const response = shouldFallbackToGet(headResponse)
        ? await withRetries(
            () => fetchWithTimeout(fetchImpl, checkUrl, controls.timeoutMs, "GET"),
            controls,
            options.delay ?? delay,
          )
        : headResponse;

      adminExposure.push(toAdminExposure(path, shouldFallbackToGet(headResponse) ? "GET" : "HEAD", response, checkUrl));
    } catch (error) {
      errors.push(toError("admin-exposure", error));
      adminExposure.push({
        path,
        method: "HEAD",
        reachable: false,
      });
    }
  }

  return { adminExposure, errors };
}

async function collectTlsEvidence(
  url: URL,
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
): Promise<{ tls?: TlsEvidence; errors: RawScanEvidence["errors"] }> {
  if (url.protocol !== "https:") {
    return { errors: [] };
  }

  try {
    const tls = await withRetries(
      () => (options.getTlsCertificate ?? getTlsCertificate)(url, controls.timeoutMs),
      controls,
      options.delay ?? delay,
    );
    return { tls, errors: [] };
  } catch (error) {
    return { errors: [toError("tls", error)] };
  }
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: URL,
  timeoutMs: number,
  method: SafeRequestMethod,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      credentials: "omit",
      method,
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function shouldFallbackToGet(response: Response): boolean {
  return response.status === 403 || response.status === 405 || response.status === 501;
}

function toAdminExposure(
  path: string,
  method: SafeRequestMethod,
  response: Response,
  requestedUrl: URL,
): RawScanEvidence["adminExposure"][number] {
  return {
    path,
    method,
    reachable: response.status >= 200 && response.status < 400,
    httpStatus: response.status,
    finalUrl: response.url || requestedUrl.toString(),
  };
}

async function withRetries<T>(
  operation: () => Promise<T>,
  controls: Required<ScannerControls>,
  delayImpl: (milliseconds: number) => Promise<void>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= controls.retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < controls.retries && controls.delayMs > 0) {
        await delayImpl(controls.delayMs);
      }
    }
  }

  throw lastError;
}

function selectHeaders(headers: Headers): Record<string, string> {
  const selected: Record<string, string> = {};

  for (const headerName of SELECTED_HEADERS) {
    const value = headers.get(headerName);
    if (value) {
      selected[headerName] = value;
    }
  }

  return selected;
}

function detectCms(body: string, headers: Headers): NonNullable<RawScanEvidence["cms"]> {
  const evidence: string[] = [];
  const lowerBody = body.toLowerCase();
  const poweredBy = headers.get("x-powered-by")?.toLowerCase() ?? "";
  const generator = body.match(/<meta\s+[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const generatorLower = generator?.toLowerCase() ?? "";

  if (generator) {
    evidence.push(`generator:${generator}`);
  }

  const candidates: Array<{ name: Exclude<CmsName, "unknown">; markers: string[] }> = [
    { name: "wordpress", markers: ["wordpress", "wp-content", "wp-includes"] },
    { name: "joomla", markers: ["joomla", "/administrator/"] },
    { name: "drupal", markers: ["drupal", "drupal-settings-json"] },
  ];

  for (const candidate of candidates) {
    const matchedMarkers = candidate.markers.filter(
      (marker) => lowerBody.includes(marker) || generatorLower.includes(marker) || poweredBy.includes(marker),
    );
    if (matchedMarkers.length > 0) {
      evidence.push(...matchedMarkers.map((marker) => `marker:${marker}`));
      return {
        name: candidate.name,
        version: extractVersion(generator, candidate.name),
        confidence: generatorLower.includes(candidate.name) ? 0.8 : 0.6,
        evidence: Array.from(new Set(evidence)),
      };
    }
  }

  return { name: "unknown", confidence: 0, evidence };
}

function extractVersion(generator: string | undefined, cmsName: string): string | undefined {
  if (!generator?.toLowerCase().includes(cmsName)) {
    return undefined;
  }
  return generator.match(/\b\d+(?:\.\d+){0,3}\b/)?.[0];
}

async function getTlsCertificate(url: URL, timeoutMs: number): Promise<TlsEvidence> {
  return new Promise((resolve, reject) => {
    const socket = connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      // Keep the socket open long enough to record invalid certificate evidence.
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      socket.end();

      if (!certificate || Object.keys(certificate).length === 0) {
        reject(new Error("No peer certificate returned"));
        return;
      }

      resolve({
        valid: !socket.authorizationError,
        expiresAt: parseCertificateDate(certificate.valid_to),
        issuer: formatIssuer(certificate.issuer),
      });
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("TLS certificate lookup timed out"));
    });
    socket.once("error", reject);
  });
}

function parseCertificateDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatIssuer(issuer: Record<string, unknown> | undefined): string | undefined {
  if (!issuer) {
    return undefined;
  }
  const commonName = issuer.CN;
  if (typeof commonName === "string" && commonName.length > 0) {
    return commonName;
  }

  const firstIssuerValue = Object.values(issuer).find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return firstIssuerValue;
}

export function resolveScannerControls(controls: ScannerControls | undefined): Required<ScannerControls> {
  return {
    timeoutMs: controls?.timeoutMs ?? DEFAULT_SCANNER_CONTROLS.timeoutMs,
    retries: controls?.retries ?? DEFAULT_SCANNER_CONTROLS.retries,
    delayMs: controls?.delayMs ?? DEFAULT_SCANNER_CONTROLS.delayMs,
  };
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toError(stage: RawScanEvidence["errors"][number]["stage"], error: unknown) {
  return {
    stage,
    message: error instanceof Error ? error.message : String(error),
  };
}
