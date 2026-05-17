import type {
  PassiveScanEvidence,
  VulnerabilityHypothesis,
} from "../../shared/contracts.ts";
import { CMS_VULNERABILITY_CONFIDENCE_THRESHOLD } from "./types.ts";

type CmsName = Exclude<
  NonNullable<PassiveScanEvidence["cms"]>["name"],
  "unknown"
>;

export type CmsVulnerabilityEntry = {
  cms: CmsName;
  version: string;
  title: string;
  description: string;
  remediationHint: string;
  severity: "low" | "medium" | "high" | "critical";
  cvssScore: number;
  referenceIds: string[];
};

export const VULNERABLE_CMS_VERSIONS: CmsVulnerabilityEntry[] = [
  {
    cms: "wordpress",
    version: "6.4",
    title: "WordPress 6.4 requires patch review",
    description:
      "The scanner observed a WordPress 6.4 generator string. This MVP treats the version as a known-risk demo match when confidence is high, without confirming active compromise.",
    remediationHint:
      "Confirm the WordPress core and plugin patch level, then upgrade to the latest supported release.",
    severity: "high",
    cvssScore: 7.5,
    referenceIds: ["CVE-2024-31210"],
  },
  {
    cms: "joomla",
    version: "3.10",
    title: "Joomla 3.10 is past active support",
    description:
      "The scanner observed Joomla 3.10 with high confidence. End-of-support CMS versions increase exposure to public vulnerability classes.",
    remediationHint:
      "Plan an upgrade to a supported Joomla release and verify extensions before migration.",
    severity: "high",
    cvssScore: 7.2,
    referenceIds: [],
  },
  {
    cms: "drupal",
    version: "7",
    title: "Drupal 7 requires end-of-life mitigation",
    description:
      "The scanner observed Drupal 7 with high confidence. This indicates a known maintenance risk, not confirmed compromise.",
    remediationHint:
      "Move the site to a supported Drupal release or apply an approved extended-support program.",
    severity: "high",
    cvssScore: 7.8,
    referenceIds: [],
  },
];

export function findCmsVulnerability(
  cms: PassiveScanEvidence["cms"],
): CmsVulnerabilityEntry | undefined {
  if (
    !cms ||
    cms.name === "unknown" ||
    !cms.version ||
    cms.confidence < CMS_VULNERABILITY_CONFIDENCE_THRESHOLD
  ) {
    return undefined;
  }
  const version = cms.version;

  return VULNERABLE_CMS_VERSIONS.find(
    (entry) =>
      entry.cms === cms.name &&
      normalizeVersion(version).startsWith(normalizeVersion(entry.version)),
  );
}

function normalizeVersion(version: string): string {
  return version.trim().toLowerCase();
}

export type HeaderPattern = {
  header: string;
  pattern: RegExp;
  technology: string;
  category:
    | "server"
    | "framework"
    | "cms"
    | "library"
    | "cdn"
    | "other";
  confidence: number;
};

export const HEADER_PATTERNS: HeaderPattern[] = [
  {
    header: "server",
    pattern: /nginx/i,
    technology: "nginx",
    category: "server",
    confidence: 0.7,
  },
  {
    header: "server",
    pattern: /apache/i,
    technology: "apache",
    category: "server",
    confidence: 0.7,
  },
  {
    header: "server",
    pattern: /microsoft-iis/i,
    technology: "microsoft-iis",
    category: "server",
    confidence: 0.7,
  },
  {
    header: "server",
    pattern: /cloudflare/i,
    technology: "cloudflare",
    category: "cdn",
    confidence: 0.7,
  },
  {
    header: "server",
    pattern: /akamai/i,
    technology: "akamai",
    category: "cdn",
    confidence: 0.7,
  },
  {
    header: "server",
    pattern: /fastly/i,
    technology: "fastly",
    category: "cdn",
    confidence: 0.7,
  },
  {
    header: "x-powered-by",
    pattern: /php/i,
    technology: "php",
    category: "framework",
    confidence: 0.6,
  },
  {
    header: "x-powered-by",
    pattern: /asp\.net/i,
    technology: "asp.net",
    category: "framework",
    confidence: 0.6,
  },
];

export type CweTemplate = {
  cweId?: string;
  title: string;
  description: string;
};

export const MISSING_HEADER_TEMPLATES: Record<string, CweTemplate> = {
  "strict-transport-security": {
    cweId: "CWE-319",
    title: "Missing HSTS header",
    description:
      "The response did not include Strict-Transport-Security, reducing protection against downgrade and man-in-the-middle attacks.",
  },
  "content-security-policy": {
    cweId: "CWE-693",
    title: "Missing CSP header",
    description:
      "The response did not include Content-Security-Policy, increasing risk of injection-driven content execution.",
  },
  "x-frame-options": {
    title: "Clickjacking risk: missing X-Frame-Options",
    description:
      "The response did not include X-Frame-Options or CSP frame-ancestors, increasing clickjacking risk.",
  },
};
