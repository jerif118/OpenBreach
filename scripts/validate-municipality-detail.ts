import { readFileSync } from "node:fs";

import { municipalityDetailSchema } from "../src/shared/contracts.ts";

const municipalitiesSource = readFileSync("convex/municipalities.ts", "utf8");

const getQueryMatch = municipalitiesSource.match(/export const get = query\([\s\S]*?\n}\);/);

if (!getQueryMatch) {
  throw new Error("municipalities.get query must exist.");
}

const getQuerySource = getQueryMatch[0];

const requiredSnippets = [
  "args: { id: v.string() }",
  '.withIndex("by_externalId", (q) => q.eq("externalId", args.id))',
  "return null",
  '.withIndex("by_municipalityId_and_scannedAt"',
  '.withIndex("by_municipalityId_and_generatedAt"',
  '.order("desc")',
  ".take(1)",
  "scan: toScanResultContract(municipality, latestScans[0] ?? null)",
  "report: toReportMetadataContract(municipality, latestReports[0] ?? null)",
];

for (const snippet of requiredSnippets) {
  if (!getQuerySource.includes(snippet)) {
    throw new Error(`municipalities.get is missing required detail aggregate behavior: ${snippet}`);
  }
}

if (getQuerySource.includes("externalId: v.string()")) {
  throw new Error("municipalities.get must accept the public { id } argument, not { externalId }.");
}

if (getQuerySource.includes(".filter(")) {
  throw new Error("municipalities.get must use indexes, not Convex filters.");
}

const detail = municipalityDetailSchema.parse({
  municipality: {
    id: "CA-LOS-ANGELES",
    name: "Los Angeles",
    state: "CA",
    websiteUrl: "https://lacity.gov",
    population: 3898747,
    latitude: 34.0522,
    longitude: -118.2437,
    sourceUrl: "https://example.com/source",
    riskTier: "high",
  },
  scan: {
    id: "CA-LOS-ANGELES",
    municipalityId: "CA-LOS-ANGELES",
    scannedAt: "2026-05-16T09:30:00.000Z",
    requestedUrl: "https://lacity.gov",
    reachable: true,
    riskScore: 88,
    riskLevel: "critical",
    findings: [],
  },
  report: {
    reportId: "report-CA-LOS-ANGELES-2026-05-16",
    municipalityId: "CA-LOS-ANGELES",
    status: "completed",
    generatedAt: "2026-05-16T09:35:00.000Z",
    updatedAt: "2026-05-16T09:36:00.000Z",
    pdf: {
      storagePath: "data/reports/CA-LOS-ANGELES.pdf",
      fileName: "CA-LOS-ANGELES.pdf",
      contentType: "application/pdf",
    },
  },
});

if (detail.municipality.id !== "CA-LOS-ANGELES") {
  throw new Error("municipality detail contract did not preserve the public external municipality id.");
}

municipalityDetailSchema.parse({
  municipality: detail.municipality,
  scan: null,
  report: null,
});

console.log("Municipality detail validation passed.");
