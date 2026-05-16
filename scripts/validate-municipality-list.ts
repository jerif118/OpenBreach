import { readFileSync } from "node:fs";

import { municipalityListItemSchema } from "../src/shared/contracts.ts";

const municipalitiesSource = readFileSync("convex/municipalities.ts", "utf8");

const requiredSnippets = [
  "const DEFAULT_LIST_LIMIT = 50",
  "const MAX_LIST_LIMIT = 50",
  "normalizeListLimit(args.limit)",
  '.take(MAX_LIST_LIMIT)',
  '.withIndex("by_municipalityId_and_scannedAt"',
  '.order("desc")',
  '.take(1)',
  "id: municipality.externalId",
  "riskScore: riskScoreFromScan(scan) ?? fallbackRiskScoreByTier[municipality.riskTier]",
  "riskLevel: scan?.riskLevel ?? municipality.riskTier",
  "!Number.isFinite(scan.riskScore)",
  "items.sort(compareListItems).slice(0, limit)",
];

for (const snippet of requiredSnippets) {
  if (!municipalitiesSource.includes(snippet)) {
    throw new Error(`municipalities.list is missing required aggregate behavior: ${snippet}`);
  }
}

const validated = municipalityListItemSchema.parse({
  id: "CA-LOS-ANGELES",
  name: "Los Angeles",
  state: "CA",
  websiteUrl: "https://lacity.gov",
  population: 3898747,
  latitude: 34.0522,
  longitude: -118.2437,
  sourceUrl: "https://example.com/source",
  riskTier: "high",
  riskScore: 88,
  riskLevel: "critical",
});

if (validated.id !== "CA-LOS-ANGELES" || validated.riskScore !== 88 || validated.riskLevel !== "critical") {
  throw new Error("municipality list item contract did not preserve required fields.");
}

console.log("Municipality list validation passed.");
