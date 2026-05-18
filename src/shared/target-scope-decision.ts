import type { AuthorizationScope } from "./contracts";

export const validationLevels = [
  "passive",
  "semiactive",
  "controlled_validation",
] as const;

export type ValidationLevel = (typeof validationLevels)[number];

export const deniedScopeActions = [
  "login-attempts",
  "brute-force",
  "fuzzing",
  "payload-injection",
  "private-network-scanning",
  "destructive-requests",
] as const;

export type DeniedScopeAction = (typeof deniedScopeActions)[number];

type ScopeType = AuthorizationScope["scopeType"];

export type NormalizedAsset = {
  input: string;
  host: string;
  url?: string;
};

export type AcceptedScopeDecision = {
  status: "accepted";
  validationLevel: ValidationLevel;
  scopeType: Extract<ScopeType, "passive-only" | "limited">;
  primaryAsset: NormalizedAsset;
  allowedAssets: NormalizedAsset[];
  deniedAssets: NormalizedAsset[];
  allowedValidationClasses: string[];
  deniedActions: DeniedScopeAction[];
  approvalRequired: boolean;
  rateLimit: number;
  constraints: string[];
  auditDecision: "accepted";
  metadata: Record<string, unknown>;
};

export type RejectedScopeDecision = {
  status: "rejected";
  reason: string;
  auditDecision: "rejected";
};

export type ScopeDecision = AcceptedScopeDecision | RejectedScopeDecision;

export type ScopeDecisionInput = {
  primaryUrl: string;
  allowedAssets?: string[];
  deniedAssets?: string[];
  validationLevel?: string;
  rateLimit?: number;
};

const DEFAULT_RATE_LIMIT = 10;

function isValidationLevel(value: string): value is ValidationLevel {
  return (validationLevels as readonly string[]).includes(value);
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function normalizeUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    url.hostname = normalizeHostname(url.hostname);
    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }
    if (url.pathname === "/") {
      url.pathname = "";
    }
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeAsset(input: string): NormalizedAsset | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const url = normalizeUrl(trimmed);
  if (url) {
    return {
      input: trimmed,
      host: normalizeHostname(new URL(url).hostname),
      url,
    };
  }

  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed) || !trimmed.includes(".")) {
    return undefined;
  }

  return { input: trimmed, host: normalizeHostname(trimmed) };
}

function parseAssets(inputs: string[] | undefined, label: string) {
  const normalized: NormalizedAsset[] = [];
  for (const input of inputs ?? []) {
    const asset = normalizeAsset(input);
    if (!asset) {
      return { error: `${label} contains an invalid asset: ${input}` };
    }
    normalized.push(asset);
  }
  return { assets: normalized };
}

function hostCoversPrimary(assetHost: string, primaryHost: string) {
  return primaryHost === assetHost || primaryHost.endsWith(`.${assetHost}`);
}

function isPrivateOrInternalHost(host: string) {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".")
  ) {
    return true;
  }

  const octets = host.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function mapValidationLevel(level: ValidationLevel) {
  if (level === "passive") {
    return {
      scopeType: "passive-only" as const,
      allowedValidationClasses: ["passive-recon"],
      approvalRequired: false,
    };
  }

  return {
    scopeType: "limited" as const,
    allowedValidationClasses:
      level === "semiactive"
        ? ["passive-recon", "safe-metadata-checks"]
        : ["passive-recon", "safe-metadata-checks", "controlled-validation"],
    approvalRequired: true,
  };
}

export function decideTargetScope(input: ScopeDecisionInput): ScopeDecision {
  const validationLevel = input.validationLevel ?? "passive";
  if (!isValidationLevel(validationLevel)) {
    return {
      status: "rejected",
      reason: `Unsupported validation level: ${validationLevel}`,
      auditDecision: "rejected",
    };
  }

  const primaryAsset = normalizeAsset(input.primaryUrl);
  if (!primaryAsset?.url || !primaryAsset.url.startsWith("https://")) {
    return {
      status: "rejected",
      reason: "Primary URL must be a valid HTTPS URL.",
      auditDecision: "rejected",
    };
  }

  if (isPrivateOrInternalHost(primaryAsset.host)) {
    return {
      status: "rejected",
      reason: "Primary URL matches a private or internal host pattern.",
      auditDecision: "rejected",
    };
  }

  const allowed = parseAssets(input.allowedAssets, "Allowed assets");
  if (allowed.error || !allowed.assets) {
    return {
      status: "rejected",
      reason: allowed.error ?? "Allowed assets are invalid.",
      auditDecision: "rejected",
    };
  }
  if (allowed.assets.length === 0) {
    return {
      status: "rejected",
      reason: "Allowed assets must include the submitted primary URL or host.",
      auditDecision: "rejected",
    };
  }

  const denied = parseAssets(input.deniedAssets, "Denied assets");
  if (denied.error || !denied.assets) {
    return {
      status: "rejected",
      reason: denied.error ?? "Denied assets are invalid.",
      auditDecision: "rejected",
    };
  }

  if (
    denied.assets.some((asset) =>
      hostCoversPrimary(asset.host, primaryAsset.host),
    )
  ) {
    return {
      status: "rejected",
      reason: "Primary URL is explicitly denied by the submitted scope.",
      auditDecision: "rejected",
    };
  }

  if (
    !allowed.assets.some((asset) =>
      hostCoversPrimary(asset.host, primaryAsset.host),
    )
  ) {
    return {
      status: "rejected",
      reason: "Primary URL is outside the submitted allowed scope.",
      auditDecision: "rejected",
    };
  }

  const mapped = mapValidationLevel(validationLevel);
  const rateLimit = input.rateLimit ?? DEFAULT_RATE_LIMIT;
  if (!Number.isInteger(rateLimit) || rateLimit < 0) {
    return {
      status: "rejected",
      reason: "Rate limit must be a nonnegative integer.",
      auditDecision: "rejected",
    };
  }
  const allowedAssetValues = allowed.assets.map(
    (asset) => asset.url ?? asset.host,
  );
  const deniedAssetValues = denied.assets.map(
    (asset) => asset.url ?? asset.host,
  );
  const constraints = [
    `validation-level:${validationLevel}`,
    `scope-type:${mapped.scopeType}`,
    `approval-required:${mapped.approvalRequired}`,
    `rate-limit:${rateLimit}`,
    ...mapped.allowedValidationClasses.map(
      (validationClass) => `allowed-validation-class:${validationClass}`,
    ),
    ...deniedScopeActions.map((action) => `denied-action:${action}`),
  ];

  return {
    status: "accepted",
    validationLevel,
    scopeType: mapped.scopeType,
    primaryAsset,
    allowedAssets: allowed.assets,
    deniedAssets: denied.assets,
    allowedValidationClasses: mapped.allowedValidationClasses,
    deniedActions: [...deniedScopeActions],
    approvalRequired: mapped.approvalRequired,
    rateLimit,
    constraints,
    auditDecision: "accepted",
    metadata: {
      scopeDecision: "accepted",
      validationLevel,
      scopeType: mapped.scopeType,
      primaryUrl: primaryAsset.url,
      primaryHost: primaryAsset.host,
      allowedAssets: allowedAssetValues,
      deniedAssets: deniedAssetValues,
      allowedValidationClasses: mapped.allowedValidationClasses,
      deniedActions: [...deniedScopeActions],
      approvalRequired: mapped.approvalRequired,
      rateLimit,
    },
  };
}
