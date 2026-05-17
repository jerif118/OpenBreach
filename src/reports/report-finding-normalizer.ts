import {
  reportFindingSchema,
  type GenerateRemediationReportInput,
  type ReportFinding,
} from "../shared/contracts.ts";
import {
  asObject,
  looseSourcePayload,
  pickArray,
  pickString,
  severityScore,
  slugify,
  toSentence,
  type LooseRecord,
  uniqueStrings,
} from "./report-normalizer-utils.ts";
import { getScanLikeObject } from "./report-subject-risk.ts";
import {
  normalizeCategory,
  normalizeConfidence,
  normalizeFindingStatus,
  normalizeSeverity,
} from "./report-finding-classifiers.ts";

const FINDING_TITLE_KEYS = [
  "title",
  "name",
  "summary",
  "finding",
  "issue",
] as const;
const FINDING_DESCRIPTION_KEYS = [
  "description",
  "details",
  "context",
  "summary",
] as const;
const FINDING_EVIDENCE_KEYS = [
  "evidenceSummary",
  "evidence",
  "proof",
  "signal",
  "observation",
] as const;
const FINDING_REMEDIATION_KEYS = [
  "remediationHint",
  "remediation",
  "recommendation",
  "nextAction",
  "action",
] as const;
const FINDING_ID_KEYS = ["id", "slug", "key", "externalId"] as const;
const AFFECTED_ASSET_KEYS = [
  "asset",
  "target",
  "url",
  "endpoint",
  "host",
  "path",
  "resource",
] as const;
const AFFECTED_ASSET_ARRAY_KEYS = [
  "affectedAssets",
  "assets",
  "targets",
] as const;
const AFFECTED_ASSET_ENTRY_KEYS = ["name", "url", "path"] as const;

type NormalizedFindingInput = Pick<
  ReportFinding,
  | "id"
  | "category"
  | "severity"
  | "title"
  | "description"
  | "evidence"
  | "evidenceSummary"
  | "remediationHint"
  | "remediationSteps"
  | "verificationSteps"
  | "status"
  | "confidence"
  | "affectedAssets"
> & {
  raw: LooseRecord;
};

type FindingTextFields = {
  title: string;
  description: string;
  evidenceSummary: string;
  remediationHint: string;
};

function normalizeFindingTextFields(
  source: LooseRecord,
  index: number,
): FindingTextFields {
  const title =
    pickString(source, FINDING_TITLE_KEYS) ?? `Observed finding ${index + 1}`;

  return {
    title,
    description:
      pickString(source, FINDING_DESCRIPTION_KEYS) ??
      `Structured input indicates ${title.toLowerCase()} requires review.`,
    evidenceSummary:
      pickString(source, FINDING_EVIDENCE_KEYS) ??
      "The normalized input included a reportable signal, but the original evidence summary was not explicit.",
    remediationHint:
      pickString(source, FINDING_REMEDIATION_KEYS) ??
      `Review ${title.toLowerCase()} with the responsible team and apply the standard mitigation.`,
  };
}

function normalizeAffectedAssets(source: LooseRecord): string[] {
  return uniqueStrings([
    pickString(source, AFFECTED_ASSET_KEYS),
    ...pickArray(source, AFFECTED_ASSET_ARRAY_KEYS).map((entry) =>
      typeof entry === "string"
        ? entry
        : pickString(asObject(entry), AFFECTED_ASSET_ENTRY_KEYS),
    ),
  ]);
}

function buildVerificationSteps(
  title: string,
  affectedAssets: string[],
): string[] {
  const steps = [
    "Re-run the same bounded check after the mitigation is applied.",
    affectedAssets[0]
      ? `Confirm the public-facing asset still works as expected: ${affectedAssets[0]}.`
      : null,
    `Record the post-change result for ${title.toLowerCase()} and compare it with the current evidence.`,
  ];

  return uniqueStrings(steps);
}

function buildRemediationSteps(
  remediationHint: string,
  affectedAssets: string[],
): string[] {
  const normalizedHint = toSentence(remediationHint);

  return uniqueStrings([
    normalizedHint,
    affectedAssets[0]
      ? `Review the change on the affected asset: ${affectedAssets[0]}.`
      : null,
    "Assign an owner and due date before treating the item as resolved.",
  ]);
}

function buildNormalizedFindingInput(
  source: LooseRecord,
  index: number,
): NormalizedFindingInput {
  const { title, description, evidenceSummary, remediationHint } =
    normalizeFindingTextFields(source, index);
  const severity = normalizeSeverity(
    source.severity ?? source.priority ?? source.riskLevel ?? source.score,
  );
  const confidence = normalizeConfidence(source.confidence, severity);
  const affectedAssets = normalizeAffectedAssets(source);

  return {
    id:
      pickString(source, FINDING_ID_KEYS) ??
      `finding-${index + 1}-${slugify(title)}`,
    category: normalizeCategory(
      source.category,
      `${title} ${description} ${evidenceSummary}`,
    ),
    severity,
    title,
    description: toSentence(description),
    evidence: toSentence(evidenceSummary),
    evidenceSummary: toSentence(evidenceSummary),
    remediationHint: toSentence(remediationHint),
    remediationSteps: buildRemediationSteps(remediationHint, affectedAssets),
    verificationSteps: buildVerificationSteps(title, affectedAssets),
    status: normalizeFindingStatus(source.status ?? source.validationStatus),
    confidence,
    affectedAssets,
    raw: source,
  };
}

function normalizeFinding(
  candidate: unknown,
  index: number,
): ReportFinding | null {
  const source = asObject(candidate);

  if (!source) return null;

  return reportFindingSchema.parse(buildNormalizedFindingInput(source, index));
}

export function collectFindingCandidates(
  input: GenerateRemediationReportInput,
): ReportFinding[] {
  const source = looseSourcePayload(input);
  const scan = getScanLikeObject(input);
  const sourceScanFindings = pickArray(asObject(source?.scan), ["findings"]);
  const scanFindings = scan?.findings ?? [];
  const shouldUseSourceScanFindings =
    !input.scan && sourceScanFindings.length > 0;
  const shouldUseScanFindings = input.scan || sourceScanFindings.length === 0;

  const candidates = [
    ...pickArray(source, ["findings", "items", "issues"]),
    ...(shouldUseSourceScanFindings ? sourceScanFindings : []),
    ...(shouldUseScanFindings ? scanFindings : []),
  ];

  return candidates
    .map((candidate, index) => normalizeFinding(candidate, index))
    .filter((finding): finding is ReportFinding => finding !== null)
    .sort(
      (left, right) =>
        severityScore[right.severity] - severityScore[left.severity],
    );
}
