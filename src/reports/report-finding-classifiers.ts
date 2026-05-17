import type { ReportFinding } from "../shared/contracts.ts";

export function normalizeSeverity(value: unknown): ReportFinding["severity"] {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 90) return "critical";
    if (value >= 70) return "high";
    if (value >= 40) return "medium";
    if (value >= 15) return "low";
    return "info";
  }

  if (typeof value !== "string") return "medium";

  const normalized = value.toLowerCase();

  if (["critical", "crit", "urgent", "severe"].includes(normalized)) {
    return "critical";
  }

  if (["high", "major"].includes(normalized)) return "high";
  if (["medium", "moderate"].includes(normalized)) return "medium";
  if (["low", "minor"].includes(normalized)) return "low";
  return "info";
}

export function normalizeCategory(
  value: unknown,
  fallbackText: string,
): ReportFinding["category"] {
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
    if (value >= 0.75) return "high";
    if (value >= 0.4) return "medium";
    return "low";
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (
      normalized === "high" ||
      normalized === "medium" ||
      normalized === "low"
    ) {
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
