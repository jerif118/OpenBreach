import type { RawScanEvidence, ScanFinding } from "../shared/contracts.ts";

export const CMS_VULNERABILITY_CONFIDENCE_THRESHOLD = 0.8;

type CmsName = Exclude<NonNullable<RawScanEvidence["cms"]>["name"], "unknown">;

export type CmsVulnerability = {
  cms: CmsName;
  version: string;
  title: string;
  referenceIds: string[];
  severity: ScanFinding["severity"];
  description: string;
  remediationHint: string;
};

export const VULNERABLE_CMS_VERSIONS: CmsVulnerability[] = [
  {
    cms: "wordpress",
    version: "6.4",
    title: "WordPress 6.4 requires patch review",
    referenceIds: ["CVE-2024-31210"],
    severity: "high",
    description:
      "The scanner observed a WordPress 6.4 generator string. This MVP treats the version as a known-risk demo match when confidence is high, without claiming exploitation.",
    remediationHint:
      "Confirm the WordPress core and plugin patch level, then upgrade to the latest supported release.",
  },
  {
    cms: "joomla",
    version: "3.10",
    title: "Joomla 3.10 is past active support",
    referenceIds: [],
    severity: "high",
    description:
      "The scanner observed Joomla 3.10 with high confidence. End-of-support CMS versions increase exposure to public vulnerability classes.",
    remediationHint:
      "Plan an upgrade to a supported Joomla release and verify extensions before migration.",
  },
  {
    cms: "drupal",
    version: "7",
    title: "Drupal 7 requires end-of-life mitigation",
    referenceIds: [],
    severity: "high",
    description:
      "The scanner observed Drupal 7 with high confidence. This indicates a known maintenance risk, not confirmed compromise.",
    remediationHint:
      "Move the site to a supported Drupal release or apply an approved extended-support program.",
  },
];

export function findCmsVulnerability(
  cms: RawScanEvidence["cms"],
): CmsVulnerability | undefined {
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
