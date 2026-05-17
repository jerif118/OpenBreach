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

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function normalizeWhitespace(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toSentence(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function pickString(
  source: Record<string, unknown> | null,
  keys: string[],
) {
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

export function pickNumber(
  source: Record<string, unknown> | null,
  keys: string[],
) {
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
) {
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
) {
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
) {
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

export function slugify(value: string) {
  return (
    normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report-subject"
  );
}

export function uniqueStrings(values: Array<string | undefined | null>) {
  return [
    ...new Set(
      values
        .map((value) => (value ? normalizeWhitespace(value) : ""))
        .filter(Boolean),
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
