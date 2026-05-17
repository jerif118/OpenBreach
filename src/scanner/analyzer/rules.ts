import type {
  PassiveScanEvidence,
  TechnologyFingerprint,
  VulnerabilityHypothesis,
} from "../../shared/contracts.ts";
import {
  findCmsVulnerability,
  HEADER_PATTERNS,
  MISSING_HEADER_TEMPLATES,
} from "./knowledgeBase.ts";
import { TLS_EXPIRY_DAYS } from "./types.ts";

// ── Fingerprint Rules ──

export function serverHeaderRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  const server = findHeader(evidence.headers, "server");
  if (!server) return [];

  const match = HEADER_PATTERNS.find(
    (p) => p.header === "server" && p.category === "server" && p.pattern.test(server),
  );

  if (match) {
    return [
      {
        technology: match.technology,
        category: "server",
        confidence: 0.7,
        evidence: [`header:server=${server}`],
      },
    ];
  }

  return [
    {
      technology: "unknown-server",
      category: "server",
      confidence: 0.5,
      evidence: [`header:server=${server}`],
    },
  ];
}

export function xPoweredByRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  const poweredBy = findHeader(evidence.headers, "x-powered-by");
  if (!poweredBy) return [];

  const match = HEADER_PATTERNS.find(
    (p) =>
      p.header === "x-powered-by" && p.category === "framework" && p.pattern.test(poweredBy),
  );

  if (match) {
    return [
      {
        technology: match.technology,
        category: "framework",
        confidence: 0.6,
        evidence: [`header:x-powered-by=${poweredBy}`],
      },
    ];
  }

  return [
    {
      technology: "unknown-framework",
      category: "framework",
      confidence: 0.4,
      evidence: [`header:x-powered-by=${poweredBy}`],
    },
  ];
}

export function cmsDetectionRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  const cms = evidence.cms;
  if (!cms || cms.name === "unknown") return [];

  return [
    {
      technology: cms.name,
      category: "cms",
      confidence: cms.confidence,
      evidence: [`cms:name=${cms.name}`],
    },
  ];
}

export function cmsVersionRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  const cms = evidence.cms;
  if (!cms || cms.name === "unknown" || !cms.version) return [];

  return [
    {
      technology: cms.name,
      category: "cms",
      confidence: cms.confidence,
      version: cms.version,
      versionConfidence: cms.confidence,
      evidence: [`cms:version=${cms.version}`],
    },
  ];
}

export function generatorLibraryRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  const cms = evidence.cms;
  if (!cms) return [];

  const generatorEvidence = cms.evidence.find((e) => e.startsWith("generator:"));
  if (!generatorEvidence) return [];

  const generatorValue = generatorEvidence.slice("generator:".length);

  return [
    {
      technology: generatorValue || "unknown-generator",
      category: "library",
      confidence: 0.5,
      evidence: [generatorEvidence],
    },
  ];
}

export function cdnHeaderRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  const server = findHeader(evidence.headers, "server");
  if (!server) return [];

  const match = HEADER_PATTERNS.find(
    (p) => p.header === "server" && p.category === "cdn" && p.pattern.test(server),
  );

  if (!match) return [];

  return [
    {
      technology: match.technology,
      category: "cdn",
      confidence: 0.7,
      evidence: [`header:server=${server}`],
    },
  ];
}

export function missingSecurityHeadersRule(
  evidence: PassiveScanEvidence,
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    TechnologyFingerprint,
    | "technology"
    | "category"
    | "confidence"
    | "version"
    | "versionConfidence"
    | "evidence"
  >
> {
  if (!evidence.reachable) return [];

  const requiredHeaders = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
  ] as const;

  const normalizedHeaders = new Set(
    Object.keys(evidence.headers ?? {}).map((h) => h.toLowerCase()),
  );

  const missing = requiredHeaders.filter((h) => !normalizedHeaders.has(h));

  return missing.map((header) => ({
    technology: `missing-${header}`,
    category: "other",
    confidence: 0.6,
    evidence: [`header:${header}=absent`],
  }));
}

// ── Hypothesis Rules ──

export function cmsVulnerabilityRule(
  evidence: PassiveScanEvidence,
  _fingerprints: TechnologyFingerprint[],
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
> {
  const cms = evidence.cms;
  if (!cms) return [];

  const vuln = findCmsVulnerability(cms);
  if (!vuln) return [];

  return [
    {
      title: vuln.title,
      description: vuln.description,
      cvssScore: vuln.cvssScore,
      affectedComponents: [cms.name],
    },
  ];
}

export function tlsExpiryRule(
  evidence: PassiveScanEvidence,
  _fingerprints: TechnologyFingerprint[],
  options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
> {
  const tls = evidence.tls;
  if (!tls?.expiresAt) return [];

  const now = new Date(options.now()).getTime();
  const expiresAt = new Date(tls.expiresAt).getTime();

  if (!Number.isFinite(expiresAt) || !Number.isFinite(now)) return [];

  const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiry > TLS_EXPIRY_DAYS) return [];

  const isExpired = daysUntilExpiry < 0;

  return [
    {
      title: isExpired
        ? "TLS certificate has expired"
        : "TLS certificate nearing expiry",
      description: `The TLS certificate ${isExpired ? "expired" : "expires"} at ${tls.expiresAt} (${Math.abs(Math.round(daysUntilExpiry))} days ${isExpired ? "ago" : "from now"}).`,
      affectedComponents: ["tls"],
    },
  ];
}

export function missingHstsRule(
  evidence: PassiveScanEvidence,
  _fingerprints: TechnologyFingerprint[],
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
> {
  if (!evidence.reachable) return [];
  if (!evidence.requestedUrl.startsWith("https://")) return [];

  const hasHsts =
    findHeader(evidence.headers, "strict-transport-security") !== undefined;
  if (hasHsts) return [];

  const template = MISSING_HEADER_TEMPLATES["strict-transport-security"];

  return [
    {
      title: template.title,
      description: template.description,
      cweId: template.cweId,
      affectedComponents: ["strict-transport-security"],
    },
  ];
}

export function missingCspRule(
  evidence: PassiveScanEvidence,
  _fingerprints: TechnologyFingerprint[],
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
> {
  if (!evidence.reachable) return [];

  const hasCsp =
    findHeader(evidence.headers, "content-security-policy") !== undefined;
  if (hasCsp) return [];

  const template = MISSING_HEADER_TEMPLATES["content-security-policy"];

  return [
    {
      title: template.title,
      description: template.description,
      cweId: template.cweId,
      affectedComponents: ["content-security-policy"],
    },
  ];
}

export function missingXFrameOptionsRule(
  evidence: PassiveScanEvidence,
  _fingerprints: TechnologyFingerprint[],
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
> {
  if (!evidence.reachable) return [];

  const hasFrameOptions =
    findHeader(evidence.headers, "x-frame-options") !== undefined;
  if (hasFrameOptions) return [];

  const template = MISSING_HEADER_TEMPLATES["x-frame-options"];

  return [
    {
      title: template.title,
      description: template.description,
      affectedComponents: ["x-frame-options"],
    },
  ];
}

export function adminPanelExposureRule(
  evidence: PassiveScanEvidence,
  _fingerprints: TechnologyFingerprint[],
  _options: { now: () => string; idGenerator: () => string; confidenceThreshold: number },
): Array<
  Pick<
    VulnerabilityHypothesis,
    "title" | "description" | "cweId" | "cvssScore" | "affectedComponents"
  >
> {
  const exposed = evidence.adminExposure?.filter((e) => e.reachable) ?? [];

  return exposed.map((entry) => ({
    title: `Admin panel reachable at ${entry.path}`,
    description:
      "A common administrative path responded successfully to a safe passive check, indicating potential exposure.",
    affectedComponents: [entry.path],
  }));
}

// ── Rule Collections ──

export const FINGERPRINT_RULES = [
  serverHeaderRule,
  xPoweredByRule,
  cmsDetectionRule,
  cmsVersionRule,
  generatorLibraryRule,
  cdnHeaderRule,
  missingSecurityHeadersRule,
];

export const HYPOTHESIS_RULES = [
  cmsVulnerabilityRule,
  tlsExpiryRule,
  missingHstsRule,
  missingCspRule,
  missingXFrameOptionsRule,
  adminPanelExposureRule,
];

// ── Helpers ──

function findHeader(
  headers: PassiveScanEvidence["headers"],
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return undefined;
}
