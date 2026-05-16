import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/routes/index.tsx", "utf8");
const hookSource = readFileSync(
  "src/features/dashboard/use-dashboard-municipalities.ts",
  "utf8",
);

const requiredRouteSnippets = [
  "errorComponent: DashboardRouteError",
  "function DashboardRouteError",
  'status: "error"',
  'source: "convex"',
  "The dashboard data source reported an error",
  "Retry dashboard query",
];

for (const snippet of requiredRouteSnippets) {
  if (!routeSource.includes(snippet)) {
    throw new Error(
      `Dashboard route is missing live query error-path fallback evidence: ${snippet}`,
    );
  }
}

if (!hookSource.includes("useQuery(api.municipalities.list, {})")) {
  throw new Error(
    "Dashboard live path must continue to use the real api.municipalities.list query.",
  );
}

if (routeSource.includes("toDashboardMunicipalityState(new Error")) {
  throw new Error(
    "Task 6 verification must not rely on adapter-only synthetic errors.",
  );
}

console.log("Dashboard Task 6 verification validation passed.");
