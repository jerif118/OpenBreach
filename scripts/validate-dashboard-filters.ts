import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/routes/index.tsx", "utf8");

const requiredRouteSnippets = [
  "useState",
  "selectedRiskLevel",
  "selectedState",
  "stateOptions",
  "riskLegend.map",
  "filteredItems",
  "getFilteredMunicipalities",
  "filteredState",
  "<MexicoRiskMap state={filteredState} totalRows={totalRows} />",
  "<RankedRiskList state={filteredState} items={rankedItems} />",
  "DashboardFilters",
  "htmlFor=\"risk-level-filter\"",
  "id=\"risk-level-filter\"",
  "htmlFor=\"state-filter\"",
  "id=\"state-filter\"",
  "Clear filters",
  "hasActiveFilters",
  "No municipalities match the active filters",
  "Show all municipalities",
];

for (const snippet of requiredRouteSnippets) {
  if (!routeSource.includes(snippet)) {
    throw new Error(`Dashboard filters are missing required behavior: ${snippet}`);
  }
}

const mapUsageCount = routeSource.match(/filteredState/g)?.length ?? 0;

if (mapUsageCount < 2) {
  throw new Error("Dashboard filters must share one filtered state between map and ranked list.");
}

console.log("Dashboard filter validation passed.");
