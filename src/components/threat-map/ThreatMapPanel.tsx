import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { mockThreatEntries } from "./mockThreatEntries";
import { ThreatGeoMap } from "./ThreatGeoMap";
import { ThreatMapControls } from "./ThreatMapControls";
import type {
  ThreatEntry,
  ThreatSeverity,
  ThreatSeverityFilter,
} from "./threatMapTypes";

export function ThreatMapPanel() {
  const [severityFilter, setSeverityFilter] =
    useState<ThreatSeverityFilter>("all");
  const [selectedEntryId, setSelectedEntryId] = useState(
    mockThreatEntries[0]?.id ?? "",
  );
  const [isZoneCardExpanded, setIsZoneCardExpanded] = useState(false);

  const visibleEntries =
    severityFilter === "all"
      ? mockThreatEntries
      : mockThreatEntries.filter((entry) => entry.severity === severityFilter);
  const selectedEntry =
    visibleEntries.find((entry) => entry.id === selectedEntryId) ??
    visibleEntries[0] ??
    null;

  useEffect(() => {
    const filteredEntries =
      severityFilter === "all"
        ? mockThreatEntries
        : mockThreatEntries.filter((entry) => entry.severity === severityFilter);

    if (!filteredEntries.length) {
      if (selectedEntryId) {
        setSelectedEntryId("");
      }
      return;
    }

    if (!filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(filteredEntries[0].id);
    }
  }, [selectedEntryId, severityFilter]);

  return (
    <section className="relative overflow-hidden border border-primary/30 bg-[#131313] p-2">
      <div className="absolute right-0 top-0 z-10 border-b border-l border-primary/30 bg-[#131313]/80 p-2 font-mono text-[10px] text-primary/50 uppercase backdrop-blur-sm">
        Threat_Map.live
      </div>
      <div className="relative">
        <ThreatGeoMap
          entries={visibleEntries}
          selectedEntryId={selectedEntry?.id ?? ""}
          onSelectEntry={(entry) => setSelectedEntryId(entry.id)}
        />

        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <div className="pointer-events-auto">
            <ThreatMapControls
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-14 z-10 w-[320px] max-w-[calc(100%-2rem)]">
          <div className="pointer-events-auto">
            <ThreatZoneCard
              entry={selectedEntry}
              expanded={isZoneCardExpanded}
              onToggle={() => setIsZoneCardExpanded((current) => !current)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ThreatZoneCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: ThreatEntry | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-primary/15 bg-[#101516]/92 p-3 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.24em] text-primary/50 uppercase">
            Selected Zone
          </p>
          <h3 className="font-display mt-2 truncate text-base text-primary uppercase lg:text-lg">
            {entry ? entry.title : "No Active Zone"}
          </h3>
          <p className="mt-2 font-mono text-[10px] text-[#b9cacb]">
            {entry
              ? `${entry.municipality ?? "Unknown"} / ${entry.region ?? "Unknown"} / ${entry.source.toUpperCase()}`
              : "Click a heat signature to inspect a zone."}
          </p>
        </div>

        <button
          aria-expanded={expanded}
          className="flex h-9 w-9 items-center justify-center border border-primary/20 bg-black/30 font-mono text-primary transition-colors hover:bg-primary/10"
          type="button"
          onClick={onToggle}
        >
          <span
            className={`material-symbols-outlined text-lg transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-primary/10 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="Threats" value={entry ? String(entry.alerts) : "--"} />
            <StatChip
              label="Coverage"
              value={entry ? getThreatCoverage(entry) : "--"}
            />
            <StatChip
              label="Activity"
              value={entry ? getThreatActivity(entry) : "--"}
            />
            <StatChip
              label="Severity"
              tone={entry ? entry.severity : undefined}
              value={entry ? entry.severity.toUpperCase() : "--"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <ActionButton
              label="Open evidence trail"
              to="/guardian/evidence"
              tone="primary"
            />
            <ActionButton
              label="Queue re-validation"
              to="/guardian/validations"
              tone="secondary"
            />
            <ActionButton
              label="Export zone summary"
              to="/guardian/reports"
              tone="muted"
            />
          </div>

          <p className="font-mono text-[10px] text-primary/45">
            {entry ? formatThreatTimestamp(entry.createdAt) : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function getThreatCoverage(entry: ThreatEntry) {
  const coverage = Math.round(97 - entry.alerts * 2 + entry.score * 5);
  return `${Math.max(72, Math.min(99, coverage))}%`;
}

function getThreatActivity(entry: ThreatEntry) {
  const sourceBaseline =
    entry.source === "active" ? 1.2 : entry.source === "manual" ? 0.7 : 1;
  const activity = sourceBaseline + entry.alerts * 0.18 + entry.score * 0.4;
  return `${activity.toFixed(1)} Gbps`;
}

function formatThreatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: ThreatSeverity;
}) {
  const toneClassName =
    tone === "critical"
      ? "text-[#ff8fb2]"
      : tone === "high"
        ? "text-[#ffd166]"
        : tone === "medium"
          ? "text-[#72ff70]"
          : tone === "low"
            ? "text-[#7df4ff]"
            : "text-white";

  return (
    <div className="border border-primary/10 bg-[#131313]/60 p-3">
      <p className="font-mono text-[10px] text-primary/50 uppercase">{label}</p>
      <p className={`font-display mt-1 text-sm ${toneClassName}`}>{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  to,
}: {
  label: string;
  tone: "primary" | "secondary" | "muted";
  to: string;
}) {
  const className =
    tone === "primary"
      ? "border-primary text-primary hover:bg-primary/10"
      : tone === "secondary"
        ? "border-[#00e639]/30 text-[#00e639] hover:bg-[#00e639]/10"
        : "border-outline text-on-surface-variant hover:bg-white/5";

  return (
    <Link
      className={`block border px-3 py-2 text-left font-mono text-[10px] uppercase transition-colors pixel-corner ${className}`}
      to={to}
    >
      {label}
    </Link>
  );
}
