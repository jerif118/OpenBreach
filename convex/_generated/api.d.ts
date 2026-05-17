/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvalGates from "../approvalGates.js";
import type * as auditEvents from "../auditEvents.js";
import type * as auth from "../auth.js";
import type * as authorizationScopes from "../authorizationScopes.js";
import type * as findings from "../findings.js";
import type * as lib_fixtureFallback from "../lib/fixtureFallback.js";
import type * as lib_stateMachine from "../lib/stateMachine.js";
import type * as municipalities from "../municipalities.js";
import type * as passiveScanEvidence from "../passiveScanEvidence.js";
import type * as rawScanResults from "../rawScanResults.js";
import type * as reportArtifacts from "../reportArtifacts.js";
import type * as reports from "../reports.js";
import type * as scanResults from "../scanResults.js";
import type * as targets from "../targets.js";
import type * as targetsPublic from "../targetsPublic.js";
import type * as technologyFingerprints from "../technologyFingerprints.js";
import type * as testPlans from "../testPlans.js";
import type * as types from "../types.js";
import type * as users from "../users.js";
import type * as validationResults from "../validationResults.js";
import type * as vulnerabilityHypotheses from "../vulnerabilityHypotheses.js";
import type * as workflowRuns from "../workflowRuns.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  approvalGates: typeof approvalGates;
  auditEvents: typeof auditEvents;
  auth: typeof auth;
  authorizationScopes: typeof authorizationScopes;
  findings: typeof findings;
  "lib/fixtureFallback": typeof lib_fixtureFallback;
  "lib/stateMachine": typeof lib_stateMachine;
  municipalities: typeof municipalities;
  passiveScanEvidence: typeof passiveScanEvidence;
  rawScanResults: typeof rawScanResults;
  reportArtifacts: typeof reportArtifacts;
  reports: typeof reports;
  scanResults: typeof scanResults;
  targets: typeof targets;
  targetsPublic: typeof targetsPublic;
  technologyFingerprints: typeof technologyFingerprints;
  testPlans: typeof testPlans;
  types: typeof types;
  users: typeof users;
  validationResults: typeof validationResults;
  vulnerabilityHypotheses: typeof vulnerabilityHypotheses;
  workflowRuns: typeof workflowRuns;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
