import { readFileSync } from "node:fs";

const authSource = readFileSync("convex/auth.ts", "utf8");
const municipalitiesSource = readFileSync("convex/municipalities.ts", "utf8");
const reportsSource = readFileSync("convex/reports.ts", "utf8");
const rawScanResultsSource = readFileSync("convex/rawScanResults.ts", "utf8");
const scanResultsSource = readFileSync("convex/scanResults.ts", "utf8");
const usersSource = readFileSync("convex/users.ts", "utf8");
const authConfigSource = readFileSync("convex/auth.config.ts", "utf8");

const requiredAuthSnippets = [
  "ctx.auth.getUserIdentity()",
  "identity.tokenIdentifier",
  '.withIndex("by_tokenIdentifier"',
  "requireAnyRole",
  "requireAdmin",
  "requireOperatorOrAdmin",
];

for (const snippet of requiredAuthSnippets) {
  if (!authSource.includes(snippet)) {
    throw new Error(
      `Auth helper is missing required role lookup behavior: ${snippet}`,
    );
  }
}

// municipalities.seed is an internalMutation: it is not reachable from the
// public client surface, so it does not need an additional `requireAdmin`
// runtime check. This matches the pattern used by rawScanResults.upsertMany
// and scanResults.upsertEnrichedMany below.
if (!municipalitiesSource.includes("export const seed = internalMutation")) {
  throw new Error(
    "municipalities.seed must remain internal-only unless a protected public wrapper is added.",
  );
}

for (const mutationName of ["persistGenerated", "createPlaceholder"]) {
  const mutationMatch = reportsSource.match(
    new RegExp(`export const ${mutationName} = mutation\\([\\s\\S]*?\\n}\\);`),
  );
  if (!mutationMatch) {
    throw new Error(`reports.${mutationName} mutation must exist.`);
  }

  if (!mutationMatch[0].includes("await requireOperatorOrAdmin(ctx)")) {
    throw new Error(
      `reports.${mutationName} must require operator or admin role authorization.`,
    );
  }
}

if (
  !rawScanResultsSource.includes("export const upsertMany = internalMutation")
) {
  throw new Error(
    "rawScanResults.upsertMany must remain internal-only unless a protected public wrapper is added.",
  );
}

if (
  !scanResultsSource.includes(
    "export const upsertEnrichedMany = internalMutation",
  )
) {
  throw new Error(
    "scanResults.upsertEnrichedMany must remain internal-only unless a protected public wrapper is added.",
  );
}

if (
  !usersSource.includes("export const current = query") ||
  !usersSource.includes("getCurrentUserProfile(ctx)")
) {
  throw new Error(
    "users.current must expose server-derived current profile lookup.",
  );
}

if (
  !usersSource.includes("export const setRoles = mutation") ||
  !usersSource.includes("await requireAdmin(ctx)")
) {
  throw new Error(
    "users.setRoles must require admin authorization for profile role administration.",
  );
}

const protectedSources = [municipalitiesSource, reportsSource, usersSource];
for (const forbiddenSnippet of [
  "userId: v.",
  "userIdentifier: v.",
  "clerkUserId: v.",
]) {
  if (protectedSources.some((source) => source.includes(forbiddenSnippet))) {
    throw new Error(
      `Protected writes must not accept client-supplied authorization identifiers: ${forbiddenSnippet}`,
    );
  }
}

// The Clerk provider must keep its Convex applicationID and read the issuer
// domain from the environment so each deployment (dev, prod, fixture) can wire
// a different Clerk instance without code changes. See README.md > Environment.
if (
  !authConfigSource.includes('applicationID: "convex"') ||
  !authConfigSource.includes("process.env.CLERK_JWT_ISSUER_DOMAIN")
) {
  throw new Error(
    "Convex auth config must retain the Clerk provider shape for environment-specific issuer setup.",
  );
}

console.log("Auth write validation passed.");
