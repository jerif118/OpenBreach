import type { ReportFinding, RiskLevel } from "../shared/contracts.ts";

export const severityScore: Record<ReportFinding["severity"], number> = {
  info: 5,
  low: 20,
  medium: 45,
  high: 72,
  critical: 92,
};

export const severityLabels: ReportFinding["severity"][] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asObject(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toSentence(value: string): string {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function pickString(
  source: Record<string, unknown> | null,
  keys: string[],
): string | undefined {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      const normalized = normalizeWhitespace(value);

      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

export function pickNumber(
  source: Record<string, unknown> | null,
  keys: string[],
): number | undefined {
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

export function pickBoolean(
  source: Record<string, unknown> | null,
  keys: string[],
): boolean | undefined {
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

export function pickObject(
  source: Record<string, unknown> | null,
  keys: string[],
): Record<string, unknown> | null {
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

export function pickArray(
  source: Record<string, unknown> | null,
  keys: string[],
): unknown[] {
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

export function slugify(value: string): string {
  return (
    normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report-subject"
  );
}

export function uniqueStrings(
  values: Array<string | undefined | null>,
): string[] {
  return [
    ...new Set(
      values
        .map((value) => (value ? normalizeWhitespace(value) : ""))
        .filter((value): value is string => value.length > 0),
    ),
  ];
}

export function normalizeRiskLevel(value: unknown, score: number): RiskLevel {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (
      normalized === "critical" ||
      normalized === "high" ||
      normalized === "medium" ||
      normalized === "low"
    ) {
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
