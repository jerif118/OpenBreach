import type {
  AuthorizationScope,
  EvidenceEnvelope,
  PassiveScanEvidence,
  RawScanEvidence,
} from "../shared/contracts.ts";
import {
  evidenceEnvelopeSchema,
  passiveScanEvidenceSchema,
} from "../shared/contracts.ts";
import type { AcceptedScopeDecision } from "../shared/target-scope-decision.ts";
import {
  resolveScannerControls,
  scanWebsite,
  type PassiveScannerOptions,
} from "./passive.ts";
import {
  collectBoundedArtifacts,
  type BoundedArtifact,
} from "./passiveProbes.ts";

/** Default L2-style reads: robots/sitemap only; admin paths stay on the L1 probe list in passive.ts. */
export const DEFAULT_SEMIACTIVE_PATHS = [
  "/robots.txt",
  "/sitemap.xml",
] as const;

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

/** True when the hostname is covered by at least one allowed scope asset. */
export function isHostnameInAuthorizationScope(
  hostname: string,
  decision: AcceptedScopeDecision,
): boolean {
  const host = normalizeHost(hostname);
  return decision.allowedAssets.some((asset) => {
    const allowed = normalizeHost(asset.host);
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

export function rawScanEvidenceToPassiveScanEvidence(
  raw: RawScanEvidence,
  ids: {
    evidenceId: string;
    targetId: string;
    runId?: string;
  },
  extraErrors?: RawScanEvidence["errors"],
): PassiveScanEvidence {
  const mergedErrors = [...raw.errors, ...(extraErrors ?? [])];
  const headers =
    Object.keys(raw.headers).length > 0
      ? (raw.headers as Record<string, string>)
      : undefined;
  const admin = raw.adminExposure.length > 0 ? raw.adminExposure : undefined;
  const errs = mergedErrors.length > 0 ? mergedErrors : undefined;

  const cms: PassiveScanEvidence["cms"] =
    raw.cms && !(raw.cms.name === "unknown" && raw.cms.confidence === 0)
      ? {
          name: raw.cms.name,
          version: raw.cms.version,
          confidence: raw.cms.confidence,
          evidence: raw.cms.evidence,
        }
      : undefined;

  const passive: PassiveScanEvidence = {
    evidenceId: ids.evidenceId,
    targetId: ids.targetId,
    source: raw.source,
    collectedAt: raw.scannedAt,
    requestedUrl: raw.requestedUrl,
    reachable: raw.reachable,
    finalUrl: raw.finalUrl,
    httpStatus: raw.httpStatus,
    headers,
    tls: raw.tls,
    cms,
    adminExposure: admin,
    errors: errs,
    runId: ids.runId,
  };
  return passiveScanEvidenceSchema.parse(passive);
}

export function passiveScanEvidenceToEnvelope(
  authorization: AuthorizationScope,
  passive: PassiveScanEvidence,
  args: {
    envelopeId: string;
    boundedArtifacts?: readonly BoundedArtifact[];
  },
): EvidenceEnvelope {
  const metadata: Record<string, unknown> = {
    scopeRuleRef: authorization.authorizationId,
    assetId: authorization.targetId,
    authorizationId: authorization.authorizationId,
    scopeType: authorization.scopeType,
    evidenceVsRiskBoundary:
      "passive-scan payload is observational evidence only",
  };
  if (args.boundedArtifacts && args.boundedArtifacts.length > 0) {
    metadata.semiactiveArtifacts = args.boundedArtifacts;
  }

  const envelope: EvidenceEnvelope = {
    envelopeId: args.envelopeId,
    targetId: passive.targetId,
    source: "agent",
    recordedAt: passive.collectedAt,
    payloadType: "passive-scan",
    payload: passive,
    runId: passive.runId,
    metadata,
  };
  return evidenceEnvelopeSchema.parse(envelope);
}

export type ScopedReconSuccess = {
  status: "ok";
  raw: RawScanEvidence;
  passive: PassiveScanEvidence;
  envelope: EvidenceEnvelope;
  boundedArtifacts: BoundedArtifact[];
};

export type ScopedReconSkip = {
  status: "skipped";
  reason: string;
};

export async function runScopedPassiveRecon(input: {
  authorization: AuthorizationScope;
  scopeDecision: AcceptedScopeDecision;
  requestedUrl: string;
  options?: PassiveScannerOptions;
  ids?: { evidenceId?: string; envelopeId?: string; runId?: string };
  semiactivePaths?: readonly string[];
}): Promise<ScopedReconSuccess | ScopedReconSkip> {
  let url: URL;
  try {
    url = new URL(input.requestedUrl);
  } catch {
    return { status: "skipped", reason: "requestedUrl is not a valid URL" };
  }

  if (url.protocol !== "https:") {
    return { status: "skipped", reason: "Only HTTPS targets are scanned" };
  }

  if (!isHostnameInAuthorizationScope(url.hostname, input.scopeDecision)) {
    return {
      status: "skipped",
      reason: "hostname is outside the approved authorization scope assets",
    };
  }

  const raw = await scanWebsite(
    { id: input.authorization.targetId, websiteUrl: input.requestedUrl },
    input.options ?? {},
  );

  const artifactBaseUrl = new URL(raw.finalUrl ?? raw.requestedUrl);
  if (
    !isHostnameInAuthorizationScope(
      artifactBaseUrl.hostname,
      input.scopeDecision,
    )
  ) {
    return {
      status: "skipped",
      reason:
        "final URL hostname is outside the approved authorization scope assets",
    };
  }

  const controls = resolveScannerControls(input.options?.controls);
  const paths = input.semiactivePaths ?? [...DEFAULT_SEMIACTIVE_PATHS];
  const bounded = await collectBoundedArtifacts(
    artifactBaseUrl,
    paths,
    controls,
    input.options ?? {},
  );

  const evidenceId = input.ids?.evidenceId ?? globalThis.crypto.randomUUID();
  const passive = rawScanEvidenceToPassiveScanEvidence(
    raw,
    {
      evidenceId,
      targetId: input.authorization.targetId,
      runId: input.ids?.runId,
    },
    bounded.errors,
  );

  const envelopeId = input.ids?.envelopeId ?? globalThis.crypto.randomUUID();
  const envelope = passiveScanEvidenceToEnvelope(input.authorization, passive, {
    envelopeId,
    boundedArtifacts: bounded.artifacts,
  });

  return {
    status: "ok",
    raw,
    passive,
    envelope,
    boundedArtifacts: bounded.artifacts,
  };
}
