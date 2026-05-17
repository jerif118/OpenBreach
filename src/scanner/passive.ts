import {
  rawScanEvidenceSchema,
  type Municipality,
  type RawScanEvidence,
} from "../shared/contracts.ts";
import {
  collectAdminExposure,
  collectHttpEvidence,
  collectTlsEvidence,
  toError,
} from "./passiveProbes.ts";

export type ScannerControls = {
  timeoutMs?: number;
  retries?: number;
  delayMs?: number;
};

type ScannerControlName = keyof Required<ScannerControls>;

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

export const ADMIN_EXPOSURE_PATHS = [
  "/wp-login.php",
  "/wp-admin/",
  "/administrator/",
  "/admin/",
  "/user/login",
] as const;

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
    return rawScanEvidenceSchema.parse(baseEvidence);
  }

  const [httpEvidence, tlsEvidence] = await Promise.all([
    collectHttpEvidence(url, controls, options),
    collectTlsEvidence(url, controls, options),
  ]);
  const adminEvidence = await collectAdminExposure(
    url,
    controls,
    options,
    ADMIN_EXPOSURE_PATHS,
  );

  return rawScanEvidenceSchema.parse({
    ...baseEvidence,
    ...httpEvidence,
    tls: tlsEvidence.tls,
    adminExposure: adminEvidence.adminExposure,
    errors: [
      ...baseEvidence.errors,
      ...httpEvidence.errors,
      ...tlsEvidence.errors,
      ...adminEvidence.errors,
    ],
  });
}

export function resolveScannerControls(
  controls: ScannerControls | undefined,
): Required<ScannerControls> {
  return {
    timeoutMs: resolveNonnegativeNumber(
      "timeoutMs",
      controls?.timeoutMs,
      DEFAULT_SCANNER_CONTROLS.timeoutMs,
    ),
    retries: resolveNonnegativeInteger(
      "retries",
      controls?.retries,
      DEFAULT_SCANNER_CONTROLS.retries,
    ),
    delayMs: resolveNonnegativeNumber(
      "delayMs",
      controls?.delayMs,
      DEFAULT_SCANNER_CONTROLS.delayMs,
    ),
  };
}

function resolveNonnegativeNumber(
  name: ScannerControlName,
  value: number | undefined,
  defaultValue: number,
): number {
  const resolvedValue = value ?? defaultValue;
  if (!Number.isFinite(resolvedValue) || resolvedValue < 0) {
    throw new RangeError(`${name} must be a finite nonnegative number`);
  }
  return resolvedValue;
}

function resolveNonnegativeInteger(
  name: ScannerControlName,
  value: number | undefined,
  defaultValue: number,
): number {
  const resolvedValue = resolveNonnegativeNumber(name, value, defaultValue);
  if (!Number.isInteger(resolvedValue)) {
    throw new RangeError(`${name} must be a nonnegative integer`);
  }
  return resolvedValue;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
