import { useEffect, useState } from "react";
import municipalitiesSeed from "../../../data/municipalities/municipalities.seed.json";
import type { PipelineTargetRecord } from "../../features/openbreach/pipeline-data";
import { ThreatGeoMap } from "./ThreatGeoMap";
import { ThreatMapControls } from "./ThreatMapControls";
import type {
  ThreatEntry,
  ThreatSeverity,
  ThreatSeverityFilter,
} from "./threatMapTypes";

export function ThreatMapPanel({
  targets,
}: {
  targets: PipelineTargetRecord[];
}) {
  const [severityFilter, setSeverityFilter] =
    useState<ThreatSeverityFilter>("all");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const pipelineEntries = buildThreatEntriesFromPipeline(targets);

  const visibleEntries =
    severityFilter === "all"
      ? pipelineEntries
      : pipelineEntries.filter((entry) => entry.severity === severityFilter);
  const selectedEntry =
    visibleEntries.find((entry) => entry.id === selectedEntryId) ??
    visibleEntries[0] ??
    null;

  useEffect(() => {
    const filteredEntries =
      severityFilter === "all"
        ? pipelineEntries
        : pipelineEntries.filter((entry) => entry.severity === severityFilter);

    if (!filteredEntries.length) {
      if (selectedEntryId) {
        setSelectedEntryId("");
      }
      return;
    }

    if (!filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(filteredEntries[0].id);
    }
  }, [pipelineEntries, selectedEntryId, severityFilter]);

  return (
    <section className="border-primary/30 relative overflow-hidden border bg-[#131313] p-2">
      <div className="border-primary/30 text-primary/50 absolute top-0 right-0 z-10 border-b border-l bg-[#131313]/80 p-2 font-mono text-[10px] uppercase backdrop-blur-sm">
        Threat_Map.live
      </div>
      <div className="relative">
        <ThreatGeoMap
          entries={visibleEntries}
          selectedEntryId={selectedEntry?.id ?? ""}
          onSelectEntry={(entry) => setSelectedEntryId(entry.id)}
        />

        <div className="pointer-events-none absolute top-4 left-4 z-10">
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

type MunicipalitySeedRecord = {
  latitude: number;
  longitude: number;
  name: string;
  state: string;
};

const municipalitySeedByKey = new Map(
  (municipalitiesSeed as MunicipalitySeedRecord[]).flatMap((entry) => {
    const exactKey = buildMunicipalityLookupKey(entry.name, entry.state);
    const nameOnlyKey = buildMunicipalityLookupKey(entry.name, "");
    return [
      [exactKey, entry],
      [nameOnlyKey, entry],
    ] as const;
  }),
);

function buildThreatEntriesFromPipeline(targets: PipelineTargetRecord[]) {
  return targets.flatMap((target) => {
    if (target.approvalStatus !== "approved") {
      return [];
    }

    const coordinates = getTargetCoordinates(target);
    if (!coordinates) {
      return [];
    }

    const severity = getTargetThreatSeverity(target);

    return [
      {
        id: target.targetId,
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        title: target.name,
        municipality: target.geography?.city ?? target.name,
        region: target.geography?.region,
        severity,
        score: getTargetThreatScore(target, severity),
        alerts: Math.max(target.alerts, target.findings.length),
        source: getTargetThreatSource(target),
        createdAt:
          target.validation?.executedAt ??
          target.reportArtifact?.generatedAt ??
          target.evidence?.collectedAt ??
          target.approvalGate?.requestedAt ??
          target.latestRun?.startedAt ??
          new Date(0).toISOString(),
      } satisfies ThreatEntry,
    ];
  });
}

function getTargetCoordinates(target: PipelineTargetRecord) {
  if (
    Number.isFinite(target.latitude) &&
    Number.isFinite(target.longitude) &&
    target.latitude !== undefined &&
    target.longitude !== undefined
  ) {
    return {
      latitude: target.latitude,
      longitude: target.longitude,
    };
  }

  const lookupKey = buildMunicipalityLookupKey(
    target.geography?.city ?? target.name,
    target.geography?.region ?? "",
  );
  const fallback =
    municipalitySeedByKey.get(lookupKey) ??
    municipalitySeedByKey.get(
      buildMunicipalityLookupKey(target.geography?.city ?? target.name, ""),
    );

  if (!fallback) {
    return null;
  }

  return {
    latitude: fallback.latitude,
    longitude: fallback.longitude,
  };
}

function buildMunicipalityLookupKey(name: string, region: string) {
  return `${normalizeLookupToken(name)}::${normalizeLookupToken(region)}`;
}

function normalizeLookupToken(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getTargetThreatSeverity(target: PipelineTargetRecord): ThreatSeverity {
  const findingSeverity = target.findings
    .map((finding) => finding.severity)
    .sort(compareFindingSeverities)[0];

  if (findingSeverity === "critical") return "critical";
  if (findingSeverity === "high") return "high";
  if (findingSeverity === "medium") return "medium";
  if (findingSeverity === "low") return "low";

  return target.riskTier;
}

function compareFindingSeverities(left: string, right: string) {
  return getSeverityRank(right) - getSeverityRank(left);
}

function getSeverityRank(severity: string) {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function getTargetThreatScore(
  target: PipelineTargetRecord,
  severity: ThreatSeverity,
) {
  const baseline =
    severity === "critical"
      ? 0.95
      : severity === "high"
        ? 0.76
        : severity === "medium"
          ? 0.54
          : 0.3;

  return Math.max(baseline, target.coverage / 100);
}

function getTargetThreatSource(
  target: PipelineTargetRecord,
): ThreatEntry["source"] {
  if (target.validation) {
    return "manual";
  }

  if (
    target.validationLevel === "controlled_validation" ||
    target.validationLevel === "semiactive"
  ) {
    return "active";
  }

  return "passive";
}
