import {
  generateRemediationReportInputSchema,
  reportFindingSchema,
  type GenerateRemediationReportInput,
  type ReportFinding,
  type RiskLevel,
  type ScanResult,
} from "../shared/contracts.ts";

type NormalizedSubject = {
  id: string;
  name: string;
  kind: string;
  websiteUrl?: string;
  state?: string;
};

export type NormalizedReportInput = {
  generatedAt: string;
  subject: NormalizedSubject;
  riskScore: number;
  riskLevel: RiskLevel;
  findings: ReportFinding[];
  scopeNarrative: string;
  scopeBullets: string[];
  authorizationNarrative: string;
  authorizationBullets: string[];
  methodologyNarrative: string;
  methodologyBullets: string[];
  skippedTests: string[];
  validationStatus: string[];
  limitations: string[];
  remediationChecklist: string[];
  verificationGuidance: string[];
  sourceData: unknown;
};

const severityScore: Record<ReportFinding["severity"], number> = {
  info: 5,
  low: 20,
  medium: 45,
  high: 72,
  critical: 92,
};

const severityLabels: ReportFinding["severity"][] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeWhitespace(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function toSentence(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function pickString(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && normalizeWhitespace(value)) {
      return normalizeWhitespace(value);
    }
  }

  return undefined;
}

function pickNumber(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function pickBoolean(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function pickObject(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const candidate = asObject(source[key]);

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function pickArray(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return [];
  }

  for (const key of keys) {
    const candidate = asArray(source[key]);

    if (candidate.length > 0) {
      return candidate;
    }
  }

  return [];
}

function slugify(value: string) {
  return (
    normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report-subject"
  );
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => (value ? normalizeWhitespace(value) : "")).filter(Boolean))];
}

function normalizeSeverity(value: unknown): ReportFinding["severity"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 90) {
      return "critical";
    }

    if (value >= 70) {
      return "high";
    }

    if (value >= 40) {
      return "medium";
    }

    if (value >= 15) {
      return "low";
    }

    return "info";
  }

  if (typeof value !== "string") {
    return "medium";
  }

  const normalized = value.toLowerCase();

  if (["critical", "crit", "urgent", "severe"].includes(normalized)) {
    return "critical";
  }

  if (["high", "major"].includes(normalized)) {
    return "high";
  }

  if (["medium", "moderate"].includes(normalized)) {
    return "medium";
  }

  if (["low", "minor"].includes(normalized)) {
    return "low";
  }

  return "info";
}

function normalizeRiskLevel(value: unknown, score: number): RiskLevel {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
      return normalized;
    }
  }

  if (score >= 75) {
    return "critical";
  }

  if (score >= 50) {
    return "high";
  }

  if (score >= 25) {
    return "medium";
  }

  return "low";
}

function normalizeCategory(value: unknown, fallbackText: string): ReportFinding["category"] {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (
      normalized === "tls" ||
      normalized === "headers" ||
      normalized === "cms" ||
      normalized === "exposure" ||
      normalized === "admin-exposure" ||
      normalized === "availability" ||
      normalized === "known-vulnerability"
    ) {
      return normalized;
    }
  }

  const text = fallbackText.toLowerCase();

  if (text.includes("tls") || text.includes("certificate") || text.includes("ssl")) {
    return "tls";
  }

  if (text.includes("header") || text.includes("csp") || text.includes("hsts")) {
    return "headers";
  }

  if (text.includes("wordpress") || text.includes("drupal") || text.includes("joomla") || text.includes("cms")) {
    return "cms";
  }

  if (text.includes("admin")) {
    return "admin-exposure";
  }

  if (text.includes("availability") || text.includes("reachable") || text.includes("timeout")) {
    return "availability";
  }

  if (text.includes("vulnerability") || text.includes("cve") || text.includes("outdated")) {
    return "known-vulnerability";
  }

  return "exposure";
}

function normalizeConfidence(value: unknown, severity: ReportFinding["severity"]): ReportFinding["confidence"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0.75) {
      return "high";
    }

    if (value >= 0.4) {
      return "medium";
    }

    return "low";
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized === "high" || normalized === "medium" || normalized === "low") {
      return normalized;
    }
  }

  if (severity === "critical" || severity === "high") {
    return "high";
  }

  if (severity === "medium") {
    return "medium";
  }

  return "low";
}

function normalizeFindingStatus(value: unknown): ReportFinding["status"] {
  if (typeof value !== "string") {
    return "observed";
  }

  const normalized = value.toLowerCase();

  if (normalized === "confirmed") {
    return "confirmed";
  }

  if (normalized === "likely" || normalized === "probable" || normalized === "hypothesis") {
    return "likely";
  }

  if (normalized === "skipped" || normalized === "denied") {
    return "skipped";
  }

  if (normalized === "unresolved" || normalized === "halted" || normalized === "error") {
    return "unresolved";
  }

  return "observed";
}

function buildVerificationSteps(title: string, affectedAssets: string[]) {
  const steps = [
    "Re-run the same bounded check after the mitigation is applied.",
    affectedAssets[0] ? `Confirm the public-facing asset still works as expected: ${affectedAssets[0]}.` : null,
    `Record the post-change result for ${title.toLowerCase()} and compare it with the current evidence.`,
  ];

  return uniqueStrings(steps);
}

function buildRemediationSteps(remediationHint: string, affectedAssets: string[]) {
  const normalizedHint = toSentence(remediationHint);

  return uniqueStrings([
    normalizedHint,
    affectedAssets[0] ? `Review the change on the affected asset: ${affectedAssets[0]}.` : null,
    "Assign an owner and due date before treating the item as resolved.",
  ]);
}

function normalizeFinding(candidate: unknown, index: number): ReportFinding | null {
  const source = asObject(candidate);

  if (!source) {
    return null;
  }

  const title =
    pickString(source, ["title", "name", "summary", "finding", "issue"]) ??
    `Observed finding ${index + 1}`;
  const description =
    pickString(source, ["description", "details", "context", "summary"]) ??
    `Structured input indicates ${title.toLowerCase()} requires review.`;
  const evidenceSummary =
    pickString(source, ["evidenceSummary", "evidence", "proof", "signal", "observation"]) ??
    "The normalized input included a reportable signal, but the original evidence summary was not explicit.";
  const remediationHint =
    pickString(source, ["remediationHint", "remediation", "recommendation", "nextAction", "action"]) ??
    `Review ${title.toLowerCase()} with the responsible team and apply the standard mitigation.`;
  const severity = normalizeSeverity(
    source.severity ?? source.priority ?? source.riskLevel ?? source.score,
  );
  const confidence = normalizeConfidence(source.confidence, severity);
  const affectedAssets = uniqueStrings([
    pickString(source, ["asset", "target", "url", "endpoint", "host", "path", "resource"]),
    ...pickArray(source, ["affectedAssets", "assets", "targets"])
      .map((entry) => (typeof entry === "string" ? entry : pickString(asObject(entry), ["name", "url", "path"]))),
  ]);

  return reportFindingSchema.parse({
    id: pickString(source, ["id", "slug", "key", "externalId"]) ?? `finding-${index + 1}-${slugify(title)}`,
    category: normalizeCategory(source.category, `${title} ${description} ${evidenceSummary}`),
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

function getScanLikeObject(input: GenerateRemediationReportInput) {
  if (input.scan) {
    return input.scan;
  }

  const source = asObject(input.sourceData);
  const scanCandidate = asObject(source?.scan);

  if (!scanCandidate) {
    return null;
  }

  try {
    return scanCandidate as ScanResult;
  } catch {
    return null;
  }
}

function deriveSubject(input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);
  const target = pickObject(source, ["target", "subject", "targetProfile"]);

  const id =
    input.municipality?.id ??
    scan?.municipalityId ??
    pickString(target, ["id", "externalId", "slug"]) ??
    pickString(source, ["municipalityId", "targetId", "subjectId", "id"]) ??
    "generic-target";
  const name =
    input.municipality?.name ??
    pickString(target, ["name", "displayName", "label"]) ??
    pickString(source, ["municipalityName", "targetName", "subjectName", "name"]) ??
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
    kind: pickString(target, ["kind", "category", "type"]) ?? "public-facing target",
    websiteUrl,
    state:
      input.municipality?.state ??
      pickString(target, ["state", "region"]) ??
      pickString(source, ["state", "region"]) ??
      undefined,
  } satisfies NormalizedSubject;
}

function collectFindingCandidates(input: GenerateRemediationReportInput) {
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
    .sort((left, right) => severityScore[right.severity] - severityScore[left.severity]);
}

function deriveRiskScore(findings: ReportFinding[], input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);
  const directScore =
    scan?.riskScore ??
    scan?.score ??
    pickNumber(source, ["riskScore", "score", "priorityScore", "severityScore"]);

  if (directScore !== undefined) {
    return Math.max(0, Math.min(100, directScore));
  }

  if (findings.length === 0) {
    return 0;
  }

  const total = findings.reduce((sum, finding) => sum + severityScore[finding.severity], 0);
  return Math.min(100, Math.round(total / findings.length));
}

function deriveRiskLevel(score: number, findings: ReportFinding[], input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);

  return normalizeRiskLevel(scan?.riskLevel ?? pickString(source, ["riskLevel", "tier"]), score);
}

function deriveScopeSection(subject: NormalizedSubject, input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scope = pickObject(source, ["scope", "authorizationScope"]);
  const scopeBullets = uniqueStrings([
    subject.websiteUrl ? `Primary public URL: ${subject.websiteUrl}` : null,
    subject.state ? `Region or state reference: ${subject.state}` : null,
    pickString(scope, ["targetType", "assetType", "scopeType"]),
    ...pickArray(scope, ["allowedAssets", "targets", "inScope"]).map((entry) =>
      typeof entry === "string" ? entry : pickString(asObject(entry), ["name", "url", "path"]),
    ),
  ]);

  return {
    narrative: toSentence(
      pickString(scope, ["summary", "description"]) ??
        `${subject.name} was treated as the scoped ${subject.kind} for this report. The report generator normalized the available structured input and limited the output to the provided target context.`,
    ),
    bullets:
      scopeBullets.length > 0
        ? scopeBullets
        : ["The source input did not provide an explicit asset inventory beyond the main target context."],
  };
}

function deriveAuthorizationSection(input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scope = pickObject(source, ["authorizationScope", "scope"]);
  const authorized = pickBoolean(scope, ["authorized", "approved", "isApproved"]);
  const bullets = uniqueStrings([
    ...pickArray(scope, ["allowedActions", "validationClasses"]).map((entry) =>
      typeof entry === "string" ? entry : pickString(asObject(entry), ["name", "label"]),
    ),
    ...pickArray(scope, ["forbiddenActions", "deniedActions", "outOfScope"]).map((entry) =>
      typeof entry === "string" ? entry : pickString(asObject(entry), ["name", "label"]),
    ),
    pickString(scope, ["timeWindow", "approvalWindow"]),
    pickString(scope, ["rateLimit", "rateLimits"]),
  ]);

  const narrative =
    pickString(scope, ["summary", "authorizationSummary"]) ??
    (authorized === false
      ? "The input indicates the target was not approved for additional validation. The report stays descriptive and limited to the provided evidence."
      : authorized === true
        ? "The input indicates the target was approved within a bounded scope. The report remains limited to the supplied evidence and avoids exploit or payload guidance."
        : "No explicit authorization object was supplied. The report generator treated the input as evidence-only and did not add new tests or claims.");

  return {
    narrative: toSentence(narrative),
    bullets:
      bullets.length > 0
        ? bullets
        : ["No detailed authorization fields were supplied in the current input payload."],
  };
}

function deriveMethodologySection(input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);
  const explicitMethodology = pickArray(source, ["methodology", "steps", "workflow"]).map((entry) =>
    typeof entry === "string" ? entry : pickString(asObject(entry), ["title", "summary", "description"]),
  );

  const bullets = uniqueStrings([
    ...explicitMethodology,
    scan?.requestedUrl ? `Reviewed structured scan evidence for ${scan.requestedUrl}.` : null,
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

function deriveSkippedTests(input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const explicitSkipped = [
    ...pickArray(source, ["skippedTests", "skipped", "deniedTests", "notTested"]).map((entry) =>
      typeof entry === "string" ? entry : pickString(asObject(entry), ["summary", "reason", "name"]),
    ),
  ];

  return uniqueStrings([
    ...explicitSkipped,
    "Active exploitation, credential testing, fuzzing, destructive requests, and private-network actions were out of scope.",
  ]);
}

function deriveValidationStatus(input: GenerateRemediationReportInput) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);
  const validations = pickArray(source, ["validationResults", "validations", "results"]).map((entry, index) => {
    const candidate = asObject(entry);

    if (!candidate) {
      return undefined;
    }

    const label = pickString(candidate, ["title", "name"]) ?? `Validation ${index + 1}`;
    const outcome = pickString(candidate, ["status", "result", "outcome"]) ?? "status not provided";
    const detail = pickString(candidate, ["summary", "details", "reason"]);

    return toSentence(`${label}: ${outcome}${detail ? `. ${detail}` : ""}`);
  });

  return uniqueStrings([
    ...validations,
    scan?.reachable === true ? "The passive target appeared reachable during the supplied observation window." : null,
    scan?.reachable === false ? "The passive target did not appear reachable during the supplied observation window." : null,
    scan?.httpStatus ? `Observed HTTP status: ${scan.httpStatus}.` : null,
    validations.length === 0 ? "No explicit controlled validation result was supplied in the structured input." : null,
  ]);
}

function deriveLimitations(input: GenerateRemediationReportInput, findings: ReportFinding[]) {
  const source = asObject(input.sourceData);
  const scan = getScanLikeObject(input);
  const errors = pickArray(source, ["errors", "limitations"]).map((entry) =>
    typeof entry === "string" ? entry : pickString(asObject(entry), ["message", "summary", "reason"]),
  );
  const missingSections = [
    pickObject(source, ["authorizationScope", "scope"]) ? null : "Authorization scope details were not fully supplied.",
    pickArray(source, ["validationResults", "validations"]).length > 0
      ? null
      : "No explicit validation result set was supplied, so unresolved uncertainty remains.",
    findings.length > 0 ? null : "No structured findings were supplied; the report is limited to contextual guidance.",
    scan ? null : "No scan-shaped object was supplied, so some transport details were inferred from generic input.",
  ];

  return uniqueStrings([
    ...errors,
    ...missingSections,
    "The report summarizes the provided evidence and should not be interpreted as proof of exploitability or breach.",
  ]);
}

function deriveRemediationChecklist(findings: ReportFinding[]) {
  const checklist = findings.flatMap((finding) => [
    ...finding.remediationSteps,
    `Confirm ownership for ${finding.title.toLowerCase()} before the next review cycle.`,
  ]);

  return uniqueStrings(
    checklist.length > 0
      ? checklist
      : ["Review the normalized input with the responsible team and define the next bounded remediation step."],
  ).slice(0, 10);
}

function deriveVerificationGuidance(findings: ReportFinding[]) {
  const guidance = findings.flatMap((finding) => finding.verificationSteps);

  return uniqueStrings(
    guidance.length > 0
      ? guidance
      : ["After the next change, repeat the same bounded observation path and compare the result with this report."],
  ).slice(0, 10);
}

export function normalizeReportInput(rawInput: GenerateRemediationReportInput): NormalizedReportInput {
  const input = generateRemediationReportInputSchema.parse(rawInput);
  const findings = collectFindingCandidates(input);
  const riskScore = deriveRiskScore(findings, input);
  const riskLevel = deriveRiskLevel(riskScore, findings, input);
  const subject = deriveSubject(input);
  const scope = deriveScopeSection(subject, input);
  const authorization = deriveAuthorizationSection(input);
  const methodology = deriveMethodologySection(input);

  return {
    generatedAt:
      input.generatedAt ??
      pickString(asObject(input.sourceData), ["generatedAt"]) ??
      new Date("2026-01-01T00:00:00.000Z").toISOString(),
    subject,
    riskScore,
    riskLevel,
    findings,
    scopeNarrative: scope.narrative,
    scopeBullets: scope.bullets,
    authorizationNarrative: authorization.narrative,
    authorizationBullets: authorization.bullets,
    methodologyNarrative: methodology.narrative,
    methodologyBullets: methodology.bullets,
    skippedTests: deriveSkippedTests(input),
    validationStatus: deriveValidationStatus(input),
    limitations: deriveLimitations(input, findings),
    remediationChecklist: deriveRemediationChecklist(findings),
    verificationGuidance: deriveVerificationGuidance(findings),
    sourceData: input.sourceData ?? rawInput,
  };
}

export function summarizeFindingsBySeverity(findings: ReportFinding[]) {
  return severityLabels
    .map((severity) => {
      const count = findings.filter((finding) => finding.severity === severity).length;
      return count > 0 ? `${severity}: ${count}` : null;
    })
    .filter((entry): entry is string => entry !== null);
}
