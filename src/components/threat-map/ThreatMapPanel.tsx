import { useEffect, useState } from "react";
import { mockThreatEntries } from "./mockThreatEntries";
import { ThreatGeoMap } from "./ThreatGeoMap";
import { ThreatMapControls } from "./ThreatMapControls";
import type { ThreatSeverityFilter } from "./threatMapTypes";

export function ThreatMapPanel() {
  const [severityFilter, setSeverityFilter] =
    useState<ThreatSeverityFilter>("all");
  const [selectedEntryId, setSelectedEntryId] = useState(
    mockThreatEntries[0]?.id ?? "",
  );

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
      </div>
    </section>
  );
}
