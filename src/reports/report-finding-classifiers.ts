import {
  reportFindingSchema,
  scanFindingSchema,
  type ReportFinding,
} from "../shared/contracts.ts";

const REPORT_FINDING_CATEGORY_SET = new Set<string>(
  scanFindingSchema.shape.category.options,
);

const REPORT_FINDING_CONFIDENCE_SET = new Set<string>(
  reportFindingSchema.shape.confidence.unwrap().options,
);

type AliasRule<T extends string> = {
  output: T;
  aliases: readonly string[];
};

type ThresholdRule<T extends string> = {
  output: T;
  minimum: number;
};

const SEVERITY_THRESHOLD_RULES = [
  { output: "critical", minimum: 90 },
  { output: "high", minimum: 70 },
  { output: "medium", minimum: 40 },
  { output: "low", minimum: 15 },
] as const satisfies readonly ThresholdRule<ReportFinding["severity"]>[];

const SEVERITY_ALIAS_RULES = [
  { output: "critical", aliases: ["critical", "crit", "urgent", "severe"] },
  { output: "high", aliases: ["high", "major"] },
  { output: "medium", aliases: ["medium", "moderate"] },
  { output: "low", aliases: ["low", "minor"] },
] as const satisfies readonly AliasRule<ReportFinding["severity"]>[];

const CONFIDENCE_THRESHOLD_RULES = [
  { output: "high", minimum: 0.75 },
  { output: "medium", minimum: 0.4 },
] as const satisfies readonly ThresholdRule<ReportFinding["confidence"]>[];

const CATEGORY_KEYWORD_RULES = [
  { output: "tls", keywords: ["tls", "certificate", "ssl"] },
  { output: "headers", keywords: ["header", "csp", "hsts"] },
  { output: "cms", keywords: ["wordpress", "drupal", "joomla", "cms"] },
  { output: "admin-exposure", keywords: ["admin"] },
  {
    output: "availability",
    keywords: ["availability", "reachable", "timeout"],
  },
  {
    output: "known-vulnerability",
    keywords: ["vulnerability", "cve", "outdated"],
  },
] as const satisfies readonly {
  output: ReportFinding["category"];
  keywords: readonly string[];
}[];

const STATUS_ALIAS_RULES = [
  { output: "confirmed", aliases: ["confirmed"] },
  { output: "likely", aliases: ["likely", "probable", "hypothesis"] },
  { output: "skipped", aliases: ["skipped", "denied"] },
  { output: "unresolved", aliases: ["unresolved", "halted", "error"] },
] as const satisfies readonly AliasRule<ReportFinding["status"]>[];

function matchAlias<T extends string>(
  value: string,
  rules: readonly AliasRule<T>[],
): T | undefined {
  return rules.find((rule) => rule.aliases.includes(value))?.output;
}

function matchThreshold<T extends string>(
  value: number,
  rules: readonly ThresholdRule<T>[],
): T | undefined {
  return rules.find((rule) => value >= rule.minimum)?.output;
}

function isReportFindingCategory(
  value: string,
): value is ReportFinding["category"] {
  return REPORT_FINDING_CATEGORY_SET.has(value);
}

function isReportFindingConfidence(
  value: string,
): value is ReportFinding["confidence"] {
  return REPORT_FINDING_CONFIDENCE_SET.has(value);
}

export function normalizeSeverity(value: unknown): ReportFinding["severity"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    return matchThreshold(value, SEVERITY_THRESHOLD_RULES) ?? "info";
  }

  if (typeof value !== "string") return "info";

  const normalized = value.trim().toLowerCase();

  return matchAlias(normalized, SEVERITY_ALIAS_RULES) ?? "info";
}

export function normalizeCategory(
  value: unknown,
  fallbackText: string,
): ReportFinding["category"] {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (isReportFindingCategory(normalized)) {
      return normalized;
    }
  }

  const text = fallbackText.toLowerCase();
  const keywordMatch = CATEGORY_KEYWORD_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  );

  if (keywordMatch) return keywordMatch.output;

  return "exposure";
}

export function normalizeConfidence(
  value: unknown,
  severity: ReportFinding["severity"],
): ReportFinding["confidence"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    return matchThreshold(value, CONFIDENCE_THRESHOLD_RULES) ?? "low";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (isReportFindingConfidence(normalized)) {
      return normalized;
    }
  }

  if (severity === "critical" || severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

export function normalizeFindingStatus(
  value: unknown,
): ReportFinding["status"] {
  if (typeof value !== "string") return "observed";

  const normalized = value.trim().toLowerCase();

  return matchAlias(normalized, STATUS_ALIAS_RULES) ?? "observed";
}
