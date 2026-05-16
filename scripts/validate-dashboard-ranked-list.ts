import { existsSync, readFileSync } from "node:fs";

const routeSource = readFileSync("src/routes/index.tsx", "utf8");
const detailRoutePath = "src/routes/municipalities.$id.tsx";

const requiredRouteSnippets = [
  "import { Link, createFileRoute } from \"@tanstack/react-router\"",
  "getRankedMunicipalities",
  "b.riskScore - a.riskScore",
  "Rank {index + 1}",
  "item.name",
  "item.state",
  "item.riskScore",
  "getRiskDisplay(item.riskLevel)",
  "to=\"/municipalities/$id\"",
  "params={{ id: item.id }}",
  "Open detail",
  "getStatePanelTitle(state)",
  "getStatePanelCopy(state)",
];

for (const snippet of requiredRouteSnippets) {
  if (!routeSource.includes(snippet)) {
    throw new Error(`Dashboard ranked list is missing required behavior: ${snippet}`);
  }
}

if (!existsSync(detailRoutePath)) {
  throw new Error("Dashboard municipality links require a /municipalities/$id route placeholder.");
}

const detailRouteSource = readFileSync(detailRoutePath, "utf8");
const requiredDetailRouteSnippets = [
  "createFileRoute(\"/municipalities/$id\")",
  "Route.useParams()",
  "id",
  "issue #8",
  "full municipality detail",
];

for (const snippet of requiredDetailRouteSnippets) {
  if (!detailRouteSource.includes(snippet)) {
    throw new Error(`Municipality placeholder route is missing handoff behavior: ${snippet}`);
  }
}

console.log("Dashboard ranked-list validation passed.");
