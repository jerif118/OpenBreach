import type { ReportFinding } from "../shared/contracts.ts";

const SEVERITY_THRESHOLDS = {
  critical: 90,
  high: 70,
  medium: 40,
  low: 15,
} as const;

const CONFIDENCE_THRESHOLDS = {
  high: 0.75,
  medium: 0.4,
} as const;

const CRITICAL_SEVERITY_ALIASES = new Set<string>([
  "critical",
  "crit",
  "urgent",
  "severe",
]);
const HIGH_SEVERITY_ALIASES = new Set<string>(["high", "major"]);
const MEDIUM_SEVERITY_ALIASES = new Set<string>(["medium", "moderate"]);
const LOW_SEVERITY_ALIASES = new Set<string>(["low", "minor"]);

const REPORT_FINDING_CATEGORIES = [
  "tls",
  "headers",
  "cms",
  "exposure",
  "admin-exposure",
  "availability",
  "known-vulnerability",
] as const satisfies readonly ReportFinding["category"][];

const REPORT_FINDING_CONFIDENCE_VALUES = [
  "high",
  "medium",
  "low",
] as const satisfies readonly ReportFinding["confidence"][];

const REPORT_FINDING_CATEGORY_SET = new Set<string>(REPORT_FINDING_CATEGORIES);
const REPORT_FINDING_CONFIDENCE_SET = new Set<string>(
  REPORT_FINDING_CONFIDENCE_VALUES,
);

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
    if (value >= SEVERITY_THRESHOLDS.critical) return "critical";
    if (value >= SEVERITY_THRESHOLDS.high) return "high";
    if (value >= SEVERITY_THRESHOLDS.medium) return "medium";
    if (value >= SEVERITY_THRESHOLDS.low) return "low";
    return "info";
  }

  if (typeof value !== "string") return "medium";

  const normalized = value.toLowerCase();

  if (CRITICAL_SEVERITY_ALIASES.has(normalized)) {
    return "critical";
  }

  if (HIGH_SEVERITY_ALIASES.has(normalized)) return "high";
  if (MEDIUM_SEVERITY_ALIASES.has(normalized)) return "medium";
  if (LOW_SEVERITY_ALIASES.has(normalized)) return "low";
  return "info";
}

export function normalizeCategory(
  value: unknown,
  fallbackText: string,
): ReportFinding["category"] {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (isReportFindingCategory(normalized)) {
      return normalized;
    }
  }

  const text = fallbackText.toLowerCase();

  if (
    text.includes("tls") ||
    text.includes("certificate") ||
    text.includes("ssl")
  ) {
    return "tls";
  }

  if (
    text.includes("header") ||
    text.includes("csp") ||
    text.includes("hsts")
  ) {
    return "headers";
  }

  if (
    text.includes("wordpress") ||
    text.includes("drupal") ||
    text.includes("joomla") ||
    text.includes("cms")
  ) {
    return "cms";
  }

  if (text.includes("admin")) return "admin-exposure";

  if (
    text.includes("availability") ||
    text.includes("reachable") ||
    text.includes("timeout")
  ) {
    return "availability";
  }

  if (
    text.includes("vulnerability") ||
    text.includes("cve") ||
    text.includes("outdated")
  ) {
    return "known-vulnerability";
  }

  return "exposure";
}

export function normalizeConfidence(
  value: unknown,
  severity: ReportFinding["severity"],
): ReportFinding["confidence"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= CONFIDENCE_THRESHOLDS.high) return "high";
    if (value >= CONFIDENCE_THRESHOLDS.medium) return "medium";
    return "low";
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

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

  const normalized = value.toLowerCase();

  if (normalized === "confirmed") return "confirmed";

  if (
    normalized === "likely" ||
    normalized === "probable" ||
    normalized === "hypothesis"
  ) {
    return "likely";
  }

  if (normalized === "skipped" || normalized === "denied") return "skipped";

  if (
    normalized === "unresolved" ||
    normalized === "halted" ||
    normalized === "error"
  ) {
    return "unresolved";
  }

  return "observed";
}
