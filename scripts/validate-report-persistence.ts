import { readFileSync } from "node:fs";

const schemaSource = readFileSync("convex/schema.ts", "utf8");
const reportsSource = readFileSync("convex/reports.ts", "utf8");

const requiredSchemaSnippets = [
  "status: reportStatus",
  "updatedAt: v.string()",
  "pdf: v.optional(reportPdfReference)",
  "error: v.optional(v.string())",
  '.index("by_municipalityId_and_generatedAt", ["municipalityId", "generatedAt"])',
];

for (const snippet of requiredSchemaSnippets) {
  if (!schemaSource.includes(snippet)) {
    throw new Error(`Report schema is missing required persistence metadata: ${snippet}`);
  }
}

if (!reportsSource.includes("export const persistGenerated = mutation")) {
  throw new Error("reports.persistGenerated mutation must persist generated report status metadata.");
}

if (!reportsSource.includes("requireOperatorOrAdmin")) {
  throw new Error("Report persistence writes must require operator or admin authorization.");
}

if (reportsSource.includes("userId: v.") || reportsSource.includes("userIdentifier: v.")) {
  throw new Error("Report persistence mutations must not accept user identifiers for authorization.");
}

const getForMunicipalityMatch = reportsSource.match(
  /export const getForMunicipality = query\([\s\S]*?\n}\);/,
);

if (!getForMunicipalityMatch) {
  throw new Error("reports.getForMunicipality query must exist.");
}

const getForMunicipalitySource = getForMunicipalityMatch[0];

const latestLookupRequirements = [
  '.withIndex("by_municipalityId_and_generatedAt"',
  '.order("desc")',
  ".take(1)",
  "return reports[0] ?? null",
];

for (const snippet of latestLookupRequirements) {
  if (!getForMunicipalitySource.includes(snippet)) {
    throw new Error(`Latest report lookup is missing: ${snippet}`);
  }
}

if (getForMunicipalitySource.includes("limit") || getForMunicipalitySource.includes("take(args.limit")) {
  throw new Error("Latest report lookup must return one latest report or null, not a caller-sized list.");
}

if (getForMunicipalitySource.includes(".filter(")) {
  throw new Error("Latest report lookup must use an index, not Convex filters.");
}

console.log("Report persistence validation passed.");
