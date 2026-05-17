import {
  reportFindingSchema,
  type GenerateRemediationReportInput,
  type ReportFinding,
} from "../shared/contracts.ts";
import {
  asObject,
  pickArray,
  pickString,
  severityScore,
  slugify,
  toSentence,
  uniqueStrings,
} from "./report-normalizer-utils.ts";
import { getScanLikeObject } from "./report-subject-risk.ts";
import {
  normalizeCategory,
  normalizeConfidence,
  normalizeFindingStatus,
  normalizeSeverity,
} from "./report-finding-classifiers.ts";

function buildVerificationSteps(title: string, affectedAssets: string[]) {
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
) {
  const normalizedHint = toSentence(remediationHint);

  return uniqueStrings([
    normalizedHint,
    affectedAssets[0]
      ? `Review the change on the affected asset: ${affectedAssets[0]}.`
      : null,
    "Assign an owner and due date before treating the item as resolved.",
  ]);
}

function normalizeFinding(
  candidate: unknown,
  index: number,
): ReportFinding | null {
  const source = asObject(candidate);

  if (!source) return null;

  const title =
    pickString(source, ["title", "name", "summary", "finding", "issue"]) ??
    `Observed finding ${index + 1}`;
  const description =
    pickString(source, ["description", "details", "context", "summary"]) ??
    `Structured input indicates ${title.toLowerCase()} requires review.`;
  const evidenceSummary =
    pickString(source, [
      "evidenceSummary",
      "evidence",
      "proof",
      "signal",
      "observation",
    ]) ??
    "The normalized input included a reportable signal, but the original evidence summary was not explicit.";
  const remediationHint =
    pickString(source, [
      "remediationHint",
      "remediation",
      "recommendation",
      "nextAction",
      "action",
    ]) ??
    `Review ${title.toLowerCase()} with the responsible team and apply the standard mitigation.`;
  const severity = normalizeSeverity(
    source.severity ?? source.priority ?? source.riskLevel ?? source.score,
  );
  const confidence = normalizeConfidence(source.confidence, severity);
  const affectedAssets = uniqueStrings([
    pickString(source, [
      "asset",
      "target",
      "url",
      "endpoint",
      "host",
      "path",
      "resource",
    ]),
    ...pickArray(source, ["affectedAssets", "assets", "targets"]).map((entry) =>
      typeof entry === "string"
        ? entry
        : pickString(asObject(entry), ["name", "url", "path"]),
    ),
  ]);

  return reportFindingSchema.parse({
    id:
      pickString(source, ["id", "slug", "key", "externalId"]) ??
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
  });
}

export function collectFindingCandidates(
  input: GenerateRemediationReportInput,
) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);

  const candidates = [
    ...pickArray(source, ["findings", "items", "issues"]),
    ...pickArray(asObject(source?.scan), ["findings"]),
    ...(scan?.findings ?? []),
  ];

  return candidates
    .map((candidate, index) => normalizeFinding(candidate, index))
    .filter((finding): finding is ReportFinding => finding !== null)
    .sort(
      (left, right) =>
        severityScore[right.severity] - severityScore[left.severity],
    );
}
