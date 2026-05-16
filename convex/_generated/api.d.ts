/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvals from "../approvals.js";
import type * as auditEvents from "../auditEvents.js";
import type * as auth from "../auth.js";
import type * as evidence from "../evidence.js";
import type * as findings from "../findings.js";
import type * as hypotheses from "../hypotheses.js";
import type * as municipalities from "../municipalities.js";
import type * as rawScanResults from "../rawScanResults.js";
import type * as reports from "../reports.js";
import type * as scanResults from "../scanResults.js";
import type * as targets from "../targets.js";
import type * as users from "../users.js";
import type * as validations from "../validations.js";
import type * as workflowRuns from "../workflowRuns.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  approvals: typeof approvals;
  auditEvents: typeof auditEvents;
  auth: typeof auth;
  evidence: typeof evidence;
  findings: typeof findings;
  hypotheses: typeof hypotheses;
  municipalities: typeof municipalities;
  rawScanResults: typeof rawScanResults;
  reports: typeof reports;
  scanResults: typeof scanResults;
  targets: typeof targets;
  users: typeof users;
  validations: typeof validations;
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
