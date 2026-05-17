import type { RawScanEvidence, ScanFinding } from "../shared/contracts.ts";
import { findCmsVulnerability } from "./vulnerableCmsKnowledgeBase.ts";

export const BASELINE_SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
] as const;

type BaselineSecurityHeader = (typeof BASELINE_SECURITY_HEADERS)[number];

type HeaderFindingDetail = Pick<
  ScanFinding,
  "id" | "title" | "remediationHint"
>;

const HEADER_FINDING_DETAILS: Record<BaselineSecurityHeader, HeaderFindingDetail> =
  {
    "strict-transport-security": {
      id: "finding-header-missing-hsts",
      title: "Missing HTTP Strict Transport Security",
      remediationHint:
        "Enable HSTS after confirming HTTPS is stable for the site and subdomains.",
    },
    "content-security-policy": {
      id: "finding-header-missing-csp",
      title: "Missing Content Security Policy",
      remediationHint:
        "Add a tested Content-Security-Policy that limits script, frame, and object sources.",
    },
    "x-content-type-options": {
      id: "finding-header-missing-content-type-options",
      title: "Missing X-Content-Type-Options",
      remediationHint:
        "Send X-Content-Type-Options: nosniff on HTML and static asset responses.",
    },
    "x-frame-options": {
      id: "finding-header-missing-frame-protection",
      title: "Missing frame protection header",
      remediationHint:
        "Use Content-Security-Policy frame-ancestors or X-Frame-Options to limit clickjacking risk.",
    },
  };

export function generateFindings(evidence: RawScanEvidence): ScanFinding[] {
  const findings: ScanFinding[] = [];

  if (!evidence.reachable) {
    findings.push({
      id: "finding-availability-unreachable",
      category: "availability",
      severity: "high",
      title: "Public website was unreachable",
      description:
        "The passive scanner could not reach the public municipal website during the scan window.",
      evidence:
        evidence.errors.length > 0
          ? evidence.errors
              .map((error) => `${error.stage}: ${error.message}`)
              .join("; ")
          : "HTTP request did not return a reachable response.",
      remediationHint:
        "Verify DNS, hosting, firewall, and uptime monitoring for the public website.",
    });
  }

  if (evidence.tls?.valid === false) {
    findings.push({
      id: "finding-tls-invalid",
      category: "tls",
      severity: "high",
      title: "TLS certificate is invalid",
      description:
        "The HTTPS certificate was observable but did not validate successfully.",
      evidence: `Issuer: ${evidence.tls.issuer ?? "unknown"}; expires: ${evidence.tls.expiresAt ?? "unknown"}`,
      remediationHint:
        "Install a valid certificate from a trusted authority and automate renewal before expiry.",
    });
  } else if (isExpired(evidence.tls?.expiresAt, evidence.scannedAt)) {
    findings.push({
      id: "finding-tls-expired",
      category: "tls",
      severity: "high",
      title: "TLS certificate is expired",
      description:
        "The observed HTTPS certificate expiry date is before the scan timestamp.",
      evidence: `Certificate expired at ${evidence.tls?.expiresAt}`,
      remediationHint:
        "Renew the HTTPS certificate and confirm the full certificate chain is served correctly.",
    });
  }

  for (const header of missingSecurityHeaders(evidence.headers)) {
    findings.push(headerFinding(header));
  }

  const exposedAdminPaths = evidence.adminExposure.filter(
    (entry) => entry.reachable,
  );
  if (exposedAdminPaths.length > 0) {
    findings.push({
      id: "finding-admin-path-exposed",
      category: "admin-exposure",
      severity: "medium",
      title: "Public admin path is reachable",
      description:
        "One or more common CMS or generic admin paths responded successfully to safe passive checks.",
      evidence: exposedAdminPaths
        .map(
          (entry) =>
            `${entry.path} returned ${entry.httpStatus ?? "reachable"}`,
        )
        .join("; "),
      remediationHint:
        "Restrict administrative entry points with access controls, MFA, and monitoring where operationally possible.",
    });
  }

  if (evidence.cms && evidence.cms.name !== "unknown") {
    findings.push({
      id: "finding-cms-detected",
      category: "cms",
      severity: "low",
      title: "CMS fingerprint was detected",
      description:
        "Public page evidence revealed a likely CMS fingerprint. This is informational unless combined with other risk evidence.",
      evidence: `${evidence.cms.name}${evidence.cms.version ? ` ${evidence.cms.version}` : ""}; confidence ${evidence.cms.confidence}; evidence ${evidence.cms.evidence.join(", ")}`,
      remediationHint:
        "Keep CMS core, extensions, and themes patched, and remove unnecessary public version disclosures where practical.",
    });
  }

  const cmsVulnerability = findCmsVulnerability(evidence.cms);
  if (cmsVulnerability) {
    findings.push({
      id: `finding-known-vulnerable-${cmsVulnerability.cms}-${cmsVulnerability.version.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      category: "known-vulnerability",
      severity: cmsVulnerability.severity,
      title: cmsVulnerability.title,
      description: cmsVulnerability.description,
      evidence: [
        `${cmsVulnerability.cms} ${evidence.cms?.version}`,
        `confidence ${evidence.cms?.confidence}`,
        cmsVulnerability.referenceIds.length > 0
          ? `references ${cmsVulnerability.referenceIds.join(", ")}`
          : undefined,
      ]
        .filter(Boolean)
        .join("; "),
      remediationHint: cmsVulnerability.remediationHint,
    });
  }

  return findings;
}

function missingSecurityHeaders(
  headers: RawScanEvidence["headers"],
): BaselineSecurityHeader[] {
  const normalizedNames = new Set(
    Object.keys(headers).map((header) => header.toLowerCase()),
  );
  return BASELINE_SECURITY_HEADERS.filter(
    (header) => !normalizedNames.has(header),
  );
}

function headerFinding(header: BaselineSecurityHeader): ScanFinding {
  const details = HEADER_FINDING_DETAILS[header];

  return {
    id: details.id,
    category: "headers",
    severity: "medium",
    title: details.title,
    description:
      "A baseline browser security response header was not observed in the passive HTTP response.",
    evidence: `${header} was not present in the selected response headers.`,
    remediationHint: details.remediationHint,
  };
}

function isExpired(expiresAt: string | undefined, scannedAt: string): boolean {
  if (!expiresAt) {
    return false;
  }
  const expiryMs = new Date(expiresAt).getTime();
  const scannedMs = new Date(scannedAt).getTime();
  if (!Number.isFinite(expiryMs) || !Number.isFinite(scannedMs)) {
    return false;
  }
  return expiryMs < scannedMs;
}
