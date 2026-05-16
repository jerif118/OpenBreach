import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/routes/index.tsx", "utf8");
const mapSource = readFileSync(
  "src/features/dashboard/mexico-risk-map.tsx",
  "utf8",
);
const riskDisplaySource = readFileSync(
  "src/features/dashboard/risk-display.ts",
  "utf8",
);

const requiredRouteSnippets = [
  "MexicoRiskMap",
  "riskLegend",
  "getRiskDisplay",
  "../features/dashboard/mexico-risk-map.tsx",
  "../features/dashboard/risk-display.ts",
];

const requiredMapSnippets = [
  "projectMexicoCoordinate",
  "MEXICO_LONGITUDE_RANGE",
  "MEXICO_LATITUDE_RANGE",
  "Number.isFinite",
  "latitude",
  "longitude",
  "getRiskDisplay(item.riskLevel)",
  "aria-label",
  "tabIndex={0}",
  "omitted",
  "No positionable municipality markers",
  "button",
];

const requiredRiskDisplaySnippets = [
  "critical",
  "high",
  "medium",
  "low",
  "markerClassName",
  "swatchClassName",
  "textClassName",
  "Critical risk",
  "High risk",
  "Medium risk",
  "Low risk",
];

for (const snippet of requiredRouteSnippets) {
  if (!routeSource.includes(snippet)) {
    throw new Error(
      `Dashboard route is missing map integration snippet: ${snippet}`,
    );
  }
}

for (const snippet of requiredMapSnippets) {
  if (!mapSource.includes(snippet)) {
    throw new Error(
      `Mexico risk map is missing required marker behavior: ${snippet}`,
    );
  }
}

for (const snippet of requiredRiskDisplaySnippets) {
  if (!riskDisplaySource.includes(snippet)) {
    throw new Error(
      `Risk display mapping is missing required shared value: ${snippet}`,
    );
  }
}

console.log("Dashboard map validation passed.");
