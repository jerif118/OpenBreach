import type { RawScanEvidence } from "../shared/contracts.ts";

type CmsName = NonNullable<RawScanEvidence["cms"]>["name"];

export function detectCms(
  body: string,
  headers: Headers,
): NonNullable<RawScanEvidence["cms"]> {
  const evidence: string[] = [];
  const lowerBody = body.toLowerCase();
  const poweredBy = headers.get("x-powered-by")?.toLowerCase() ?? "";
  const generator = body.match(
    /<meta\s+[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i,
  )?.[1];
  const generatorLower = generator?.toLowerCase() ?? "";

  if (generator) {
    evidence.push(`generator:${generator}`);
  }

  const candidates: Array<{
    name: Exclude<CmsName, "unknown">;
    markers: string[];
  }> = [
    { name: "wordpress", markers: ["wordpress", "wp-content", "wp-includes"] },
    { name: "joomla", markers: ["joomla", "/administrator/"] },
    { name: "drupal", markers: ["drupal", "drupal-settings-json"] },
  ];

  for (const candidate of candidates) {
    const matchedMarkers = candidate.markers.filter(
      (marker) =>
        lowerBody.includes(marker) ||
        generatorLower.includes(marker) ||
        poweredBy.includes(marker),
    );
    if (matchedMarkers.length > 0) {
      evidence.push(...matchedMarkers.map((marker) => `marker:${marker}`));
      return {
        name: candidate.name,
        version: extractVersion(generator, candidate.name),
        confidence: generatorLower.includes(candidate.name) ? 0.8 : 0.6,
        evidence: Array.from(new Set(evidence)),
      };
    }
  }

  return { name: "unknown", confidence: 0, evidence };
}

function extractVersion(
  generator: string | undefined,
  cmsName: string,
): string | undefined {
  if (!generator?.toLowerCase().includes(cmsName)) {
    return undefined;
  }
  return generator.match(/\b\d+(?:\.\d+){0,3}\b/)?.[0];
}
