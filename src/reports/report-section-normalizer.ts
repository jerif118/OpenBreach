import type {
  GenerateRemediationReportInput,
  ReportFinding,
} from "../shared/contracts.ts";
import {
  asObject,
  looseSourcePayload,
  pickArray,
  pickBoolean,
  pickObject,
  pickString,
  toSentence,
  type LooseRecord,
  uniqueStrings,
} from "./report-normalizer-utils.ts";
import { getScanLikeObject, type NormalizedSubject } from "./report-subject-risk.ts";

type ReportSectionContent = {
  narrative: string;
  bullets: string[];
};

function pickEntryString(entry: unknown, keys: string[]): string | undefined {
  return typeof entry === "string" ? entry : pickString(asObject(entry), keys);
}

function pickEntryStrings(
  source: LooseRecord | null,
  keys: string[],
  entryKeys: string[],
): Array<string | undefined> {
  return pickArray(source, keys).map((entry) =>
    pickEntryString(entry, entryKeys),
  );
}

function authorizationFallbackNarrative(
  authorized: boolean | undefined,
): string {
  if (authorized === false) {
    return "The input indicates the target was not approved for additional validation. The report stays descriptive and limited to the provided evidence.";
  }

  if (authorized === true) {
    return "The input indicates the target was approved within a bounded scope. The report remains limited to the supplied evidence and avoids exploit or payload guidance.";
  }

  return "No explicit authorization object was supplied. The report generator treated the input as evidence-only and did not add new tests or claims.";
}

function formatValidationResult(
  entry: unknown,
  index: number,
): string | undefined {
  const candidate = asObject(entry);

  if (!candidate) return undefined;

  const label =
    pickString(candidate, ["title", "name"]) ?? `Validation ${index + 1}`;
  const outcome =
    pickString(candidate, ["status", "result", "outcome"]) ??
    "status not provided";
  const detail = pickString(candidate, ["summary", "details", "reason"]);
  const detailSuffix = detail ? `. ${detail}` : "";

  return toSentence(`${label}: ${outcome}${detailSuffix}`);
}

function missingLimitationMessages(
  source: LooseRecord | null,
  scan: unknown,
  findings: ReportFinding[],
): Array<string | null> {
  return [
    pickObject(source, ["authorizationScope", "scope"])
      ? null
      : "Authorization scope details were not fully supplied.",
    pickArray(source, ["validationResults", "validations"]).length > 0
      ? null
      : "No explicit validation result set was supplied, so unresolved uncertainty remains.",
    findings.length > 0
      ? null
      : "No structured findings were supplied; the report is limited to contextual guidance.",
    scan
      ? null
      : "No scan-shaped object was supplied, so some transport details were inferred from generic input.",
  ];
}

export function deriveScopeSection(
  subject: NormalizedSubject,
  input: GenerateRemediationReportInput,
): ReportSectionContent {
  const source = looseSourcePayload(input);
  const scope = pickObject(source, ["scope", "authorizationScope"]);
  const scopeBullets = uniqueStrings([
    subject.websiteUrl ? `Primary public URL: ${subject.websiteUrl}` : null,
    subject.state ? `Region or state reference: ${subject.state}` : null,
    pickString(scope, ["targetType", "assetType", "scopeType"]),
    ...pickEntryStrings(scope, ["allowedAssets", "targets", "inScope"], [
      "name",
      "url",
      "path",
    ]),
  ]);

  return {
    narrative: toSentence(
      pickString(scope, ["summary", "description"]) ??
        `${subject.name} was treated as the scoped ${subject.kind} for this report. The report generator normalized the available structured input and limited the output to the provided target context.`,
    ),
    bullets:
      scopeBullets.length > 0
        ? scopeBullets
        : [
            "The source input did not provide an explicit asset inventory beyond the main target context.",
          ],
  };
}

export function deriveAuthorizationSection(
  input: GenerateRemediationReportInput,
): ReportSectionContent {
  const source = looseSourcePayload(input);
  const scope = pickObject(source, ["authorizationScope", "scope"]);
  const authorized = pickBoolean(scope, [
    "authorized",
    "approved",
    "isApproved",
  ]);
  const bullets = uniqueStrings([
    ...pickEntryStrings(scope, ["allowedActions", "validationClasses"], [
      "name",
      "label",
    ]),
    ...pickEntryStrings(
      scope,
      ["forbiddenActions", "deniedActions", "outOfScope"],
      ["name", "label"],
    ),
    pickString(scope, ["timeWindow", "approvalWindow"]),
    pickString(scope, ["rateLimit", "rateLimits"]),
  ]);
  const narrative =
    pickString(scope, ["summary", "authorizationSummary"]) ??
    authorizationFallbackNarrative(authorized);

  return {
    narrative: toSentence(narrative),
    bullets:
      bullets.length > 0
        ? bullets
        : [
            "No detailed authorization fields were supplied in the current input payload.",
          ],
  };
}

export function deriveMethodologySection(
  input: GenerateRemediationReportInput,
): ReportSectionContent {
  const source = looseSourcePayload(input);
  const scan = getScanLikeObject(input);
  const explicitMethodology = pickEntryStrings(
    source,
    ["methodology", "steps", "workflow"],
    ["title", "summary", "description"],
  );

  const bullets = uniqueStrings([
    ...explicitMethodology,
    scan?.requestedUrl
      ? `Reviewed structured scan evidence for ${scan.requestedUrl}.`
      : null,
    "Normalized flexible structured input into a consistent report contract before generating the PDFs.",
    "Preserved only evidence-backed observations and did not add new findings without source support.",
    "Excluded exploit payloads, credential use, and operational attack instructions from the output.",
  ]);

  return {
    narrative: toSentence(
      pickString(source, ["methodologySummary"]) ??
        "The report was assembled from structured inputs, normalized into a consistent evidence model, and then rendered into audience-specific remediation guidance.",
    ),
    bullets,
  };
}

export function deriveSkippedTests(
  input: GenerateRemediationReportInput,
): string[] {
  const source = looseSourcePayload(input);
  const explicitSkipped = pickEntryStrings(
    source,
    ["skippedTests", "skipped", "deniedTests", "notTested"],
    ["summary", "reason", "name"],
  );

  return uniqueStrings([
    ...explicitSkipped,
    "Active exploitation, credential testing, fuzzing, destructive requests, and private-network actions were out of scope.",
  ]);
}

export function deriveValidationStatus(
  input: GenerateRemediationReportInput,
): string[] {
  const source = looseSourcePayload(input);
  const scan = getScanLikeObject(input);
  const validations = pickArray(source, [
    "validationResults",
    "validations",
    "results",
  ]).map((entry, index) => formatValidationResult(entry, index));
  const validationSummaries = uniqueStrings(validations);

  return uniqueStrings([
    ...validationSummaries,
    scan?.reachable === true
      ? "The passive target appeared reachable during the supplied observation window."
      : null,
    scan?.reachable === false
      ? "The passive target did not appear reachable during the supplied observation window."
      : null,
    scan?.httpStatus ? `Observed HTTP status: ${scan.httpStatus}.` : null,
    validationSummaries.length === 0
      ? "No explicit controlled validation result was supplied in the structured input."
      : null,
  ]);
}

export function deriveLimitations(
  input: GenerateRemediationReportInput,
  findings: ReportFinding[],
): string[] {
  const source = looseSourcePayload(input);
  const scan = getScanLikeObject(input);
  const errors = pickEntryStrings(source, ["errors", "limitations"], [
    "message",
    "summary",
    "reason",
  ]);
  return uniqueStrings([
    ...errors,
    ...missingLimitationMessages(source, scan, findings),
    "The report summarizes the provided evidence and should not be interpreted as proof of exploitability or breach.",
  ]);
}
