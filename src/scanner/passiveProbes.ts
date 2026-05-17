import type { RawScanEvidence } from "../shared/contracts.ts";
import type {
  PassiveScannerOptions,
  ScannerControls,
  TlsEvidence,
} from "./passive.ts";
import { detectCms } from "./passiveCms.ts";
import { getTlsCertificate } from "./passiveTls.ts";

const SELECTED_HEADERS = [
  "server",
  "x-powered-by",
  "content-type",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
] as const;

// Passive boundary: these probes never authenticate, submit forms, or send bodies.
type SafeRequestMethod = "GET" | "HEAD";

export async function collectHttpEvidence(
  url: URL,
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
): Promise<
  Pick<
    RawScanEvidence,
    "reachable" | "finalUrl" | "httpStatus" | "headers" | "cms" | "errors"
  >
> {
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

export async function collectAdminExposure(
  baseUrl: URL,
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
  adminExposurePaths: readonly string[],
): Promise<Pick<RawScanEvidence, "adminExposure" | "errors">> {
  const fetchImpl = options.fetch ?? fetch;
  const errors: RawScanEvidence["errors"] = [];
  const adminExposure: RawScanEvidence["adminExposure"] = [];

  for (const path of adminExposurePaths) {
    const checkUrl = new URL(path, baseUrl.origin);
    try {
      const headResponse = await withRetries(
        () => fetchWithTimeout(fetchImpl, checkUrl, controls.timeoutMs, "HEAD"),
        controls,
        options.delay ?? delay,
      );
      const response = shouldFallbackToGet(headResponse)
        ? await withRetries(
            () =>
              fetchWithTimeout(fetchImpl, checkUrl, controls.timeoutMs, "GET"),
            controls,
            options.delay ?? delay,
          )
        : headResponse;

      adminExposure.push(
        toAdminExposure(
          path,
          shouldFallbackToGet(headResponse) ? "GET" : "HEAD",
          response,
          checkUrl,
        ),
      );
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

export async function collectTlsEvidence(
  url: URL,
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
): Promise<{ tls?: TlsEvidence; errors: RawScanEvidence["errors"] }> {
  if (url.protocol !== "https:") {
    return { errors: [] };
  }

  try {
    const tls = await withRetries(
      () =>
        (options.getTlsCertificate ?? getTlsCertificate)(
          url,
          controls.timeoutMs,
        ),
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
  return (
    response.status === 403 ||
    response.status === 405 ||
    response.status === 501
  );
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

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function toError(
  stage: RawScanEvidence["errors"][number]["stage"],
  error: unknown,
) {
  return {
    stage,
    message: error instanceof Error ? error.message : String(error),
  };
}
