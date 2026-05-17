export function normalizeUrlCandidate(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const candidate = trimmedValue.includes("://")
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    url.search = "";
    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function isWithinCanonicalScope(
  assetHost: string,
  canonicalHost: string,
): boolean {
  return assetHost === canonicalHost || assetHost.endsWith(`.${canonicalHost}`);
}

export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function isPrivateOrInternalHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".corp") ||
    host.endsWith(".lan") ||
    host.endsWith(".home.arpa")
  ) {
    return true;
  }

  if (!isIpv4Address(host)) {
    return false;
  }

  const [first, second] = host.split(".").map(Number);
  if (first === 10 || first === 127) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 169 && second === 254) {
    return true;
  }

  return false;
}

export function isIpv4Address(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

export function dedupeStrings<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function createTargetId(
  draft: { organizationName: string },
  canonicalHost: string,
): string {
  const seed = `${draft.organizationName}-${canonicalHost || "pending-target"}`;
  return `target-${seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

export function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

export function toDateTimeLocalInput(value: string): string {
  const date = new Date(value);
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return offsetDate.toISOString().slice(0, 16);
}

export function fromDateTimeLocalInput(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}

export function parseAssetList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
