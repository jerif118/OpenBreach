import type {
  GenerateRemediationReportInput,
  ReportFinding,
  RiskLevel,
} from "../shared/contracts.ts";
import { scanResultSchema } from "../shared/contracts.ts";
import {
  asObject,
  normalizeRiskLevel,
  pickArray,
  pickBoolean,
  pickNumber,
  pickObject,
  pickString,
  severityScore,
  type LooseRecord,
} from "./report-normalizer-utils.ts";

export type NormalizedSubject = {
  id: string;
  name: string;
  kind: string;
  websiteUrl?: string;
  state?: string;
};

export type ReportScanLike = {
  municipalityId?: string;
  requestedUrl?: string;
  finalUrl?: string;
  reachable?: boolean;
  httpStatus?: number;
  riskScore?: number;
  score?: number;
  riskLevel?: string;
  findings?: unknown[];
};

function getSourceObject(
  input: GenerateRemediationReportInput,
): LooseRecord | null {
  return asObject(input.sourceData);
}

function toLooseScanLikeObject(
  source: LooseRecord,
): ReportScanLike {
  return {
    municipalityId: pickString(source, ["municipalityId"]),
    requestedUrl: pickString(source, ["requestedUrl"]),
    finalUrl: pickString(source, ["finalUrl"]),
    reachable: pickBoolean(source, ["reachable"]),
    httpStatus: pickNumber(source, ["httpStatus"]),
    riskScore: pickNumber(source, ["riskScore"]),
    score: pickNumber(source, ["score"]),
    riskLevel: pickString(source, ["riskLevel"]),
    findings: pickArray(source, ["findings"]),
  };
}

export function getScanLikeObject(
  input: GenerateRemediationReportInput,
): ReportScanLike | null {
  if (input.scan) {
    return input.scan;
  }

  const source = getSourceObject(input);
  const scanCandidate = asObject(source?.scan);

  if (!scanCandidate) {
    return null;
  }

  const parsedScan = scanResultSchema.safeParse(scanCandidate);

  return parsedScan.success
    ? parsedScan.data
    : toLooseScanLikeObject(scanCandidate);
}

function getTargetObject(source: LooseRecord | null): LooseRecord | null {
  return pickObject(source, ["target", "subject", "targetProfile"]);
}

export function deriveSubject(
  input: GenerateRemediationReportInput,
): NormalizedSubject {
  const source = getSourceObject(input);
  const scan = getScanLikeObject(input);
  const target = getTargetObject(source);

  const id =
    input.municipality?.id ??
    scan?.municipalityId ??
    pickString(target, ["id", "externalId", "slug"]) ??
    pickString(source, ["municipalityId", "targetId", "subjectId", "id"]) ??
    "generic-target";
  const name =
    input.municipality?.name ??
    pickString(target, ["name", "displayName", "label"]) ??
    pickString(source, [
      "municipalityName",
      "targetName",
      "subjectName",
      "name",
    ]) ??
    input.municipality?.state ??
    "Approved target";
  const websiteUrl =
    input.municipality?.websiteUrl ??
    scan?.finalUrl ??
    scan?.requestedUrl ??
    pickString(target, ["websiteUrl", "url", "canonicalUrl"]) ??
    pickString(source, ["websiteUrl", "requestedUrl", "finalUrl", "url"]) ??
    undefined;

  return {
    id,
    name,
    kind:
      pickString(target, ["kind", "category", "type"]) ??
      "public-facing target",
    websiteUrl,
    state:
      input.municipality?.state ??
      pickString(target, ["state", "region"]) ??
      pickString(source, ["state", "region"]) ??
      undefined,
  } satisfies NormalizedSubject;
}

function pickDirectRiskScore(
  source: LooseRecord | null,
  scan: ReportScanLike | null,
): number | undefined {
  return (
    scan?.riskScore ??
    scan?.score ??
    pickNumber(source, [
      "riskScore",
      "score",
      "priorityScore",
      "severityScore",
    ])
  );
}

export function deriveRiskScore(
  findings: ReportFinding[],
  input: GenerateRemediationReportInput,
): number {
  const source = getSourceObject(input);
  const scan = getScanLikeObject(input);
  const directScore = pickDirectRiskScore(source, scan);

  if (directScore !== undefined) {
    return Math.max(0, Math.min(100, directScore));
  }

  if (findings.length === 0) {
    return 0;
  }

  const total = findings.reduce(
    (sum, finding) => sum + severityScore[finding.severity],
    0,
  );
  return Math.min(100, Math.round(total / findings.length));
}

export function deriveRiskLevel(
  score: number,
  findings: ReportFinding[],
  input: GenerateRemediationReportInput,
): RiskLevel {
  const source = getSourceObject(input);
  const scan = getScanLikeObject(input);

  return normalizeRiskLevel(
    scan?.riskLevel ?? pickString(source, ["riskLevel", "tier"]),
    score,
  );
}
