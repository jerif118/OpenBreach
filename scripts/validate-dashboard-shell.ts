import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/routes/index.tsx", "utf8");
const riskDisplaySource = readFileSync("src/features/dashboard/risk-display.ts", "utf8");

const requiredShellSnippets = [
  "Municipal risk command center",
  "Mexico risk map",
  "Ranked risk queue",
  "Risk legend",
  "Live Convex data",
  "Demo mock data",
  "Loading public municipality risk rows",
  "No municipality risk rows are available yet",
  "The dashboard data source reported an error",
];

const requiredRiskLabels = [
  "Critical risk",
  "High risk",
  "Medium risk",
  "Low risk",
];

for (const snippet of [...requiredShellSnippets, ...requiredRiskLabels]) {
  if (!routeSource.includes(snippet) && !riskDisplaySource.includes(snippet)) {
    throw new Error(`Dashboard shell is missing required visible copy: ${snippet}`);
  }
}

if (!routeSource.includes("lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]")) {
  throw new Error("Dashboard shell must define a map-first desktop grid.");
}

console.log("Dashboard shell validation passed.");
