import type { ScannerControls } from "./passive.ts";

// Passive boundary: these probes never authenticate, submit forms, or send bodies.
export type SafeRequestMethod = "GET" | "HEAD";

export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: URL,
  timeoutMs: number,
  method: SafeRequestMethod,
): Promise<Response> {
  assertFiniteNonnegativeNumber("timeoutMs", timeoutMs);
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

export async function withRetries<T>(
  operation: () => Promise<T>,
  controls: Required<ScannerControls>,
  delayImpl: (milliseconds: number) => Promise<void>,
): Promise<T> {
  assertNonnegativeInteger("retries", controls.retries);
  assertFiniteNonnegativeNumber("delayMs", controls.delayMs);
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

  throw toThrowableError(lastError);
}

function assertFiniteNonnegativeNumber(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite nonnegative number`);
  }
}

function assertNonnegativeInteger(name: string, value: number): void {
  assertFiniteNonnegativeNumber(name, value);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be a nonnegative integer`);
  }
}

function toThrowableError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error(error === undefined ? "Operation failed" : String(error));
}
