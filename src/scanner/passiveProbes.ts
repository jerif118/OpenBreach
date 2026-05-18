import type { RawScanEvidence } from "../shared/contracts.ts";
import type {
  PassiveScannerOptions,
  ScannerControls,
  TlsEvidence,
} from "./passive.ts";
import { detectCms } from "./passiveCms.ts";
import {
  fetchWithTimeout,
  type SafeRequestMethod,
  withRetries,
} from "./passiveRequests.ts";
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
      reachable: true,
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
    try {
      assertAdminExposurePath(path);
      const checkUrl = new URL(path, baseUrl.origin);
      const headResponse = await withRetries(
        () => fetchWithTimeout(fetchImpl, checkUrl, controls.timeoutMs, "HEAD"),
        controls,
        options.delay ?? delay,
      );
      const fallbackToGet = shouldFallbackToGet(headResponse);
      const response = fallbackToGet
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
          fallbackToGet ? "GET" : "HEAD",
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

/** Semi-active (bounded) paths: safe GET-only fetches with truncated bodies. */
export type BoundedArtifactKind = "robots-txt" | "sitemap-xml" | "fixed-path";

export type BoundedArtifact = {
  kind: BoundedArtifactKind;
  path: string;
  method: "GET";
  httpStatus?: number;
  reachable: boolean;
  finalUrl?: string;
  snippet?: string;
};

const MAX_BOUNDED_BODY_CHARS = 4096;

function boundedKindForPath(path: string): BoundedArtifactKind {
  if (path === "/robots.txt") {
    return "robots-txt";
  }
  if (path === "/sitemap.xml") {
    return "sitemap-xml";
  }
  return "fixed-path";
}

export async function collectBoundedArtifacts(
  baseUrl: URL,
  paths: readonly string[],
  controls: Required<ScannerControls>,
  options: PassiveScannerOptions,
): Promise<{
  artifacts: BoundedArtifact[];
  errors: RawScanEvidence["errors"];
}> {
  const fetchImpl = options.fetch ?? fetch;
  const delayImpl = options.delay ?? delay;
  const errors: RawScanEvidence["errors"] = [];
  const artifacts: BoundedArtifact[] = [];
  let fetchesAttempted = 0;

  for (const path of paths) {
    if (!path.startsWith("/") || path.startsWith("//")) {
      errors.push({
        stage: "http",
        message: `Bounded artifact path must be root-relative: ${path}`,
      });
      continue;
    }

    const checkUrl = new URL(path, baseUrl.origin);
    try {
      if (fetchesAttempted > 0 && controls.delayMs > 0) {
        await delayImpl(controls.delayMs);
      }
      fetchesAttempted += 1;
      const response = await withRetries(
        () => fetchWithTimeout(fetchImpl, checkUrl, controls.timeoutMs, "GET"),
        controls,
        delayImpl,
      );
      const snippet = await readBoundedResponseText(
        response,
        MAX_BOUNDED_BODY_CHARS,
      );
      artifacts.push({
        kind: boundedKindForPath(path),
        path,
        method: "GET",
        httpStatus: response.status,
        reachable: response.status >= 200 && response.status < 400,
        finalUrl: response.url || checkUrl.toString(),
        snippet,
      });
    } catch (error) {
      errors.push(toError("http", error));
      artifacts.push({
        kind: boundedKindForPath(path),
        path,
        method: "GET",
        reachable: false,
      });
    }
  }

  return { artifacts, errors };
}

async function readBoundedResponseText(
  response: Response,
  maxChars: number,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    return truncateText(text, maxChars);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  try {
    while (text.length <= maxChars) {
      const { done, value } = await reader.read();
      if (done) {
        text += decoder.decode();
        return truncateText(text, maxChars);
      }
      text += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    return truncateText(text, maxChars);
  } finally {
    reader.releaseLock();
  }
}

function truncateText(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
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

function assertAdminExposurePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`Admin exposure path must be root-relative: ${path}`);
  }
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
): RawScanEvidence["errors"][number] {
  return {
    stage,
    message: error instanceof Error ? error.message : String(error),
  };
}
