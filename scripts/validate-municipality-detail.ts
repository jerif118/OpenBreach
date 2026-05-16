import { readFileSync } from "node:fs";

import { municipalityDetailSchema } from "../src/shared/contracts.ts";
import {
  getMockMunicipalityDetailState,
  getMunicipalityDetailSource,
  municipalityDetailMockItems,
  toMunicipalityDetailState,
} from "../src/features/municipality-detail/municipality-detail-data.ts";

const municipalitiesSource = readFileSync("convex/municipalities.ts", "utf8");

const getQueryMatch = municipalitiesSource.match(
  /export const get = query\([\s\S]*?\n}\);/,
);

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
    throw new Error(
      `municipalities.get is missing required detail aggregate behavior: ${snippet}`,
    );
  }
}

if (getQuerySource.includes("externalId: v.string()")) {
  throw new Error(
    "municipalities.get must accept the public { id } argument, not { externalId }.",
  );
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
      storagePath: "data/reports/CA-LOS-ANGELES-technical.pdf",
      fileName: "CA-LOS-ANGELES-technical.pdf",
      contentType: "application/pdf",
    },
    artifacts: {
      technical: {
        variant: "technical",
        label: "Technical report PDF",
        pdf: {
          storagePath: "data/reports/CA-LOS-ANGELES-technical.pdf",
          fileName: "CA-LOS-ANGELES-technical.pdf",
          contentType: "application/pdf",
        },
      },
      friendly: {
        variant: "friendly",
        label: "Friendly report PDF",
        pdf: {
          storagePath: "data/reports/CA-LOS-ANGELES-friendly.pdf",
          fileName: "CA-LOS-ANGELES-friendly.pdf",
          contentType: "application/pdf",
        },
      },
    },
  },
});

if (detail.municipality.id !== "CA-LOS-ANGELES") {
  throw new Error(
    "municipality detail contract did not preserve the public external municipality id.",
  );
}

municipalityDetailSchema.parse({
  municipality: detail.municipality,
  scan: null,
  report: null,
});

for (const mockDetail of municipalityDetailMockItems) {
  municipalityDetailSchema.parse(mockDetail);
}

if (getMunicipalityDetailSource(undefined) !== "mock") {
  throw new Error(
    "municipality detail adapter must use mock data when Convex is not configured.",
  );
}

if (getMunicipalityDetailSource("https://example.convex.cloud") !== "convex") {
  throw new Error(
    "municipality detail adapter must use Convex when VITE_CONVEX_URL is configured.",
  );
}

const pdfMockState = getMockMunicipalityDetailState("mx-bcn-tijuana");
if (
  pdfMockState.status !== "ready" ||
  pdfMockState.reportStatus !== "available"
) {
  throw new Error(
    "municipality detail mock data must include a PDF-present report state.",
  );
}

const noReportMockState = getMockMunicipalityDetailState(
  "mx-jalisco-guadalajara",
);
if (
  noReportMockState.status !== "ready" ||
  noReportMockState.reportStatus !== "missing"
) {
  throw new Error(
    "municipality detail mock data must include a report-missing state.",
  );
}

const noScanMockState = getMockMunicipalityDetailState("mx-nl-monterrey");
if (
  noScanMockState.status !== "ready" ||
  noScanMockState.scanStatus !== "missing"
) {
  throw new Error(
    "municipality detail mock data must include a scan-missing state.",
  );
}

const missingMockState = getMockMunicipalityDetailState("missing-municipality");
if (missingMockState.status !== "not-found") {
  throw new Error(
    "municipality detail adapter must return not-found for an unknown mock id.",
  );
}

const loadingState = toMunicipalityDetailState(
  undefined,
  "convex",
  "mx-bcn-tijuana",
);
if (loadingState.status !== "loading") {
  throw new Error(
    "municipality detail adapter must preserve Convex loading state.",
  );
}

const errorState = toMunicipalityDetailState(
  new Error("detail unavailable"),
  "convex",
  "mx-bcn-tijuana",
);
if (errorState.status !== "error") {
  throw new Error("municipality detail adapter must preserve error state.");
}

const routeSource = readFileSync("src/routes/municipalities.$id.tsx", "utf8");
const routeRequiredSnippets = [
  "getMunicipalityDetailSource(import.meta.env.VITE_CONVEX_URL)",
  "getMockMunicipalityDetailState(id)",
  "useConvexMunicipalityDetail(id)",
  "scanStatus",
  "reportStatus",
  "Top recommended actions",
  "Findings grouped by severity",
  "Risk score",
  "Population",
  "Website",
  "Scan timestamp",
  "Evidence",
  "Recommended remediation",
  "Passive-scan safety disclaimer",
  "ReportDownloadPanel",
  "ProtectedOperationsPanel",
  "useAuth",
  "SignInButton",
  "UserButton",
  "Auth state is loading",
  "Sign in to view protected operator actions",
  "Signed in for protected operator actions",
  "Public detail viewing and PDF downloads remain available without sign-in",
  "Protected report regeneration remains deferred to issue #10",
  "Report download unavailable",
  "Generated PDFs available",
  "getReportDownloadLinks",
  "downloadLinks.map",
  "link.label",
  "report.pdf.fileName",
  "`/reports/${encodeURIComponent(report.pdf.fileName)}`",
  "normalized evidence",
  "observed public signals",
  "does not confirm a breach",
  "getFindingsBySeverity",
  "getTopActions",
];

for (const snippet of routeRequiredSnippets) {
  if (!routeSource.includes(snippet)) {
    throw new Error(
      `municipality detail route is missing adapter integration: ${snippet}`,
    );
  }
}

const forbiddenProtectedActionSnippets = [
  "regenerateReport",
  "createPlaceholder",
  "useMutation(api.reports",
  "useAction(api.reports",
];

for (const snippet of forbiddenProtectedActionSnippets) {
  if (routeSource.includes(snippet)) {
    throw new Error(
      `municipality detail route must not add mutation-triggering protected controls in Task 5: ${snippet}`,
    );
  }
}

const reportDownloadRouteSource = readFileSync(
  "src/routes/reports/$fileName.ts",
  "utf8",
);
const reportDownloadRouteRequiredSnippets = [
  'createFileRoute("/reports/$fileName")',
  "safePdfFileNamePattern",
  "data",
  "reports",
  '"Content-Type": "application/pdf"',
  '"Content-Disposition"',
  "status: 400",
  "status: 404",
];

for (const snippet of reportDownloadRouteRequiredSnippets) {
  if (!reportDownloadRouteSource.includes(snippet)) {
    throw new Error(
      `report download route is missing required safe download behavior: ${snippet}`,
    );
  }
}

console.log("Municipality detail validation passed.");
