import { useEffect, useRef } from "react";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import { peruOutlineGeoJson } from "./peruOutlineGeoJson";
import type { ThreatEntry } from "./threatMapTypes";

const MAP_CENTER: [number, number] = [-71.6, -15.35];
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "threat-map-background",
      type: "background",
      paint: {
        "background-color": "#041015",
      },
    },
  ],
};
const MAP_REGION_SOURCE_ID = "peru-outline";
const MAP_REGION_FILL_LAYER_ID = "peru-outline-fill";
const MAP_REGION_LINE_LAYER_ID = "peru-outline-line";
const MAP_SOURCE_ID = "threat-entries";
const MAP_HEAT_LAYER_ID = "threat-entries-heat";
const MAP_CRITICAL_LAYER_ID = "threat-entries-critical";
const MAP_POINTS_LAYER_ID = "threat-entries-points";
const MAP_SELECTION_LAYER_ID = "threat-entries-selection";
const SOUTH_PERU_BOUNDS = {
  maxLat: -11.2,
  maxLng: -68.6,
  minLat: -19.1,
  minLng: -76.9,
};

const heatmapColor: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(0, 0, 0, 0)",
  0.15,
  "rgba(0, 219, 233, 0.18)",
  0.3,
  "rgba(19, 255, 67, 0.34)",
  0.5,
  "rgba(255, 209, 102, 0.64)",
  0.72,
  "rgba(255, 94, 120, 0.82)",
  1,
  "rgba(255, 68, 125, 0.98)",
];

const severityColor: ExpressionSpecification = [
  "match",
  ["get", "severity"],
  "low",
  "#00dbe9",
  "medium",
  "#00e639",
  "high",
  "#ffd166",
  "critical",
  "#ff6b98",
  "#dbfcff",
];

type ThreatGeoJsonData = Exclude<GeoJSONSourceSpecification["data"], string>;

export function ThreatGeoMap({
  entries,
  selectedEntryId,
  onSelectEntry,
}: {
  entries: ThreatEntry[];
  selectedEntryId: string;
  onSelectEntry: (entry: ThreatEntry) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapReadyRef = useRef(false);
  const entriesRef = useRef(entries);
  const selectedEntryIdRef = useRef(selectedEntryId);
  const onSelectEntryRef = useRef(onSelectEntry);

  entriesRef.current = entries;
  selectedEntryIdRef.current = selectedEntryId;
  onSelectEntryRef.current = onSelectEntry;

  useEffect(() => {
    let isDisposed = false;

    async function initializeMap() {
      const maplibregl = await import("maplibre-gl");

      if (isDisposed || !containerRef.current || mapRef.current) {
        return;
      }

      const map = new maplibregl.Map({
        attributionControl: { compact: true },
        center: MAP_CENTER,
        container: containerRef.current,
        dragRotate: false,
        pitchWithRotate: false,
        style: MAP_STYLE,
        zoom: 5.3,
      });

      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      const handleResize = () => {
        mapRef.current?.resize();
      };

      map.once("load", () => {
        if (isDisposed) {
          return;
        }

        mapReadyRef.current = true;
        map.addSource(MAP_REGION_SOURCE_ID, {
          type: "geojson",
          data: peruOutlineGeoJson as unknown as ThreatGeoJsonData,
        });

        map.addLayer({
          id: MAP_REGION_FILL_LAYER_ID,
          type: "fill",
          source: MAP_REGION_SOURCE_ID,
          paint: {
            "fill-color": "#08212a",
            "fill-opacity": 0.55,
          },
        });

        map.addLayer({
          id: MAP_REGION_LINE_LAYER_ID,
          type: "line",
          source: MAP_REGION_SOURCE_ID,
          paint: {
            "line-color": "#58edf8",
            "line-opacity": 0.52,
            "line-width": 1.4,
          },
        });

        map.addSource(MAP_SOURCE_ID, {
          type: "geojson",
          data: buildThreatGeoJson(entriesRef.current),
        });

        map.addLayer({
          id: MAP_HEAT_LAYER_ID,
          type: "heatmap",
          source: MAP_SOURCE_ID,
          maxzoom: 10,
          paint: {
            "heatmap-color": heatmapColor,
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              0.85,
              6.5,
              1.4,
              9,
              2.1,
            ],
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              0.82,
              8,
              0.66,
              10,
              0.44,
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              22,
              6,
              34,
              8,
              54,
              10,
              70,
            ],
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["max", ["get", "score"], ["/", ["get", "alerts"], 10]],
              0,
              0,
              1,
              1.15,
            ],
          },
        });

        map.addLayer({
          id: MAP_CRITICAL_LAYER_ID,
          type: "circle",
          source: MAP_SOURCE_ID,
          filter: ["==", ["get", "severity"], "critical"],
          paint: {
            "circle-blur": 1,
            "circle-color": "rgba(255, 68, 125, 0.18)",
            "circle-opacity": 0.9,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              14,
              7,
              22,
              9,
              30,
            ],
          },
        });

        map.addLayer({
          id: MAP_POINTS_LAYER_ID,
          type: "circle",
          source: MAP_SOURCE_ID,
          paint: {
            "circle-color": severityColor,
            "circle-opacity": [
              "case",
              ["==", ["get", "severity"], "critical"],
              0.98,
              0.72,
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              ["+", 3, ["*", ["get", "score"], 5]],
              8,
              ["+", 6, ["*", ["get", "score"], 10]],
            ],
            "circle-stroke-color": "rgba(219, 252, 255, 0.85)",
            "circle-stroke-opacity": 0.75,
            "circle-stroke-width": [
              "case",
              ["==", ["get", "severity"], "critical"],
              1.6,
              0.9,
            ],
          },
        });

        map.addLayer({
          id: MAP_SELECTION_LAYER_ID,
          type: "circle",
          source: MAP_SOURCE_ID,
          filter: buildSelectedEntryFilter(selectedEntryIdRef.current),
          paint: {
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-opacity": 1,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              10,
              8,
              18,
            ],
            "circle-stroke-color": "#dbfcff",
            "circle-stroke-width": 1.4,
          },
        });

        map.on("mouseenter", MAP_POINTS_LAYER_ID, () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", MAP_POINTS_LAYER_ID, () => {
          map.getCanvas().style.cursor = "";
        });

        map.on("click", (event) => {
          const pointFeature = map.queryRenderedFeatures(event.point, {
            layers: [MAP_POINTS_LAYER_ID],
          })[0];

          const pointEntry = getEntryFromFeature(pointFeature, entriesRef.current);
          if (pointEntry) {
            onSelectEntryRef.current(pointEntry);
            return;
          }

          const nearestEntry = findNearestEntry(
            entriesRef.current,
            event.lngLat.lat,
            event.lngLat.lng,
          );

          if (nearestEntry) {
            onSelectEntryRef.current(nearestEntry);
          }
        });

        fitMapToEntries(map, entriesRef.current);
        window.addEventListener("resize", handleResize);
        requestAnimationFrame(handleResize);

        map.on("remove", () => {
          window.removeEventListener("resize", handleResize);
        });
      });
    }

    initializeMap();

    return () => {
      isDisposed = true;
      mapReadyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const source = map.getSource(MAP_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(buildThreatGeoJson(entries));
    fitMapToEntries(map, entries);
  }, [entries]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !map.getLayer(MAP_SELECTION_LAYER_ID)) {
      return;
    }

    map.setFilter(
      MAP_SELECTION_LAYER_ID,
      buildSelectedEntryFilter(selectedEntryId),
    );
  }, [selectedEntryId]);

  return (
    <div className="relative h-[420px] overflow-hidden border border-primary/20 bg-[#05090b] pixel-corner lg:h-[540px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,219,233,0.08),transparent_42%),linear-gradient(180deg,rgba(3,9,13,0.04),rgba(3,9,13,0.58))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,219,233,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,219,233,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute inset-0 scanlines opacity-18" />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <filter
            height="180%"
            id="threat-map-blur"
            width="180%"
            x="-40%"
            y="-40%"
          >
            <feGaussianBlur stdDeviation="3.6" />
          </filter>
        </defs>

        <path
          d={PERU_OUTLINE_PATH}
          fill="rgba(8,33,42,0.55)"
          stroke="rgba(88,237,248,0.52)"
          strokeWidth="0.38"
        />

        {entries.map((entry) => {
          const point = projectThreatCoordinate(entry.lng, entry.lat);
          const radius = 5 + entry.score * 6 + entry.alerts * 0.35;

          return (
            <circle
              key={`${entry.id}-heat`}
              cx={point.x}
              cy={point.y}
              fill={getThreatHeatColor(entry.severity)}
              filter="url(#threat-map-blur)"
              opacity={0.28}
              r={radius}
            />
          );
        })}

        {entries.map((entry) => {
          const point = projectThreatCoordinate(entry.lng, entry.lat);
          const isSelected = entry.id === selectedEntryId;
          const pointRadius = isSelected ? 1.4 : entry.severity === "critical" ? 1.2 : 0.8;

          return (
            <g key={entry.id}>
              {isSelected ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="none"
                  opacity={0.85}
                  r={3.2}
                  stroke="#dbfcff"
                  strokeWidth="0.35"
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                fill={getThreatMarkerColor(entry.severity)}
                opacity={0.96}
                r={pointRadius}
                stroke="rgba(219,252,255,0.92)"
                strokeWidth="0.2"
                style={{ pointerEvents: "auto" }}
                onClick={() => onSelectEntry(entry)}
              />
            </g>
          );
        })}
      </svg>

      {!entries.length ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-6 text-center">
          <div className="border border-primary/20 bg-[#131313]/90 px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.22em] text-primary uppercase">
              No zones match the current severity filter
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildThreatGeoJson(entries: ThreatEntry[]): ThreatGeoJsonData {
  return {
    type: "FeatureCollection",
    features: entries.map((entry) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [entry.lng, entry.lat],
      },
      properties: {
        ...entry,
        weight: Math.max(entry.score, Math.min(entry.alerts / 8, 1)),
      },
    })),
  };
}

function buildSelectedEntryFilter(selectedEntryId: string): FilterSpecification {
  return ["==", ["get", "id"], selectedEntryId || "__none__"];
}

function getEntryFromFeature(
  feature: { properties?: { id?: string } | null } | undefined,
  entries: ThreatEntry[],
) {
  const entryId = feature?.properties?.id;
  if (!entryId) {
    return null;
  }

  return entries.find((entry) => entry.id === entryId) ?? null;
}

function findNearestEntry(
  entries: ThreatEntry[],
  latitude: number,
  longitude: number,
) {
  let nearestEntry: ThreatEntry | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const distance = getDistanceKm(latitude, longitude, entry.lat, entry.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestEntry = entry;
    }
  }

  return nearestEntry;
}

function fitMapToEntries(map: MapLibreMap, entries: ThreatEntry[]) {
  if (!entries.length) {
    return;
  }

  if (entries.length === 1) {
    map.easeTo({
      center: [entries[0].lng, entries[0].lat],
      duration: 700,
      zoom: 7.2,
    });
    return;
  }

  let minLng = entries[0].lng;
  let maxLng = entries[0].lng;
  let minLat = entries[0].lat;
  let maxLat = entries[0].lat;

  for (const entry of entries) {
    minLng = Math.min(minLng, entry.lng);
    maxLng = Math.max(maxLng, entry.lng);
    minLat = Math.min(minLat, entry.lat);
    maxLat = Math.max(maxLat, entry.lat);
  }

  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      duration: 700,
      maxZoom: 7.4,
      padding: { top: 54, right: 54, bottom: 54, left: 54 },
    },
  );
}

function getDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusKm = 6371;
  const latitudeDelta = degreesToRadians(latitudeB - latitudeA);
  const longitudeDelta = degreesToRadians(longitudeB - longitudeA);
  const latitudeARadians = degreesToRadians(latitudeA);
  const latitudeBRadians = degreesToRadians(latitudeB);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getThreatHeatColor(severity: ThreatEntry["severity"]) {
  if (severity === "critical") {
    return "#ff5d85";
  }

  if (severity === "high") {
    return "#ffd166";
  }

  if (severity === "medium") {
    return "#00e639";
  }

  return "#00dbe9";
}

function getThreatMarkerColor(severity: ThreatEntry["severity"]) {
  if (severity === "critical") {
    return "#ff89ab";
  }

  if (severity === "high") {
    return "#ffd166";
  }

  if (severity === "medium") {
    return "#72ff70";
  }

  return "#7df4ff";
}

function projectThreatCoordinate(longitude: number, latitude: number) {
  const x =
    ((longitude - SOUTH_PERU_BOUNDS.minLng) /
      (SOUTH_PERU_BOUNDS.maxLng - SOUTH_PERU_BOUNDS.minLng)) *
    100;
  const y =
    ((SOUTH_PERU_BOUNDS.maxLat - latitude) /
      (SOUTH_PERU_BOUNDS.maxLat - SOUTH_PERU_BOUNDS.minLat)) *
    100;

  return { x, y };
}

function buildPeruOutlinePath() {
  const feature = peruOutlineGeoJson.features[0];
  if (!feature || feature.geometry.type !== "Polygon") {
    return "";
  }

  const ring = feature.geometry.coordinates[0];

  return ring
    .map((coordinate, index) => {
      const [longitude, latitude] = coordinate;
      const point = projectThreatCoordinate(longitude, latitude);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ")
    .concat(" Z");
}

const PERU_OUTLINE_PATH = buildPeruOutlinePath();
