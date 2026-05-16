import { readFileSync } from "node:fs";

import {
  dashboardMunicipalityMockItems,
  getDashboardMunicipalitySource,
  toDashboardMunicipalityState,
} from "../src/features/dashboard/dashboard-data.ts";
import { municipalityListItemSchema } from "../src/shared/contracts.ts";

for (const item of dashboardMunicipalityMockItems) {
  municipalityListItemSchema.parse(item);
}

const loadingState = toDashboardMunicipalityState(undefined, "convex");
if (loadingState.status !== "loading" || loadingState.source !== "convex") {
  throw new Error("Dashboard adapter must represent Convex loading state.");
}

const emptyState = toDashboardMunicipalityState([], "convex");
if (emptyState.status !== "empty" || emptyState.items.length !== 0) {
  throw new Error("Dashboard adapter must represent empty Convex results.");
}

const readyState = toDashboardMunicipalityState(
  dashboardMunicipalityMockItems,
  "mock",
);
if (
  readyState.status !== "ready" ||
  readyState.items.length !== dashboardMunicipalityMockItems.length
) {
  throw new Error("Dashboard adapter must represent ready municipality data.");
}

const errorState = toDashboardMunicipalityState(
  new Error("query failed"),
  "convex",
);
if (
  errorState.status !== "error" ||
  !errorState.message.includes("query failed")
) {
  throw new Error("Dashboard adapter must represent query errors.");
}

if (getDashboardMunicipalitySource("") !== "mock") {
  throw new Error("Missing Convex URL must select the mock data source.");
}

if (
  getDashboardMunicipalitySource("https://example.convex.cloud") !== "convex"
) {
  throw new Error("Configured Convex URL must select the live Convex source.");
}

const appProvidersSource = readFileSync(
  "src/providers/app-providers.tsx",
  "utf8",
);
const requiredProviderSnippets = [
  "ConvexProvider, ConvexProviderWithAuth, ConvexReactClient",
  "if (!clerkPublishableKey)",
  "<ConvexProvider client={convexClient}>{children}</ConvexProvider>",
  "<ConvexProviderWithAuth client={convexClient} useAuth={useClerkConvexAuth}>",
];

for (const snippet of requiredProviderSnippets) {
  if (!appProvidersSource.includes(snippet)) {
    throw new Error(
      `AppProviders is missing required Convex provider behavior: ${snippet}`,
    );
  }
}

console.log("Dashboard data adapter validation passed.");
