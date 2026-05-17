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
import type { ThreatEntry, ThreatSeverity } from "./threatMapTypes";

const FLAG_ICON_IDS: Record<ThreatSeverity, string> = {
  low: "threat-flag-low",
  medium: "threat-flag-medium",
  high: "threat-flag-high",
  critical: "threat-flag-critical",
};

const FLAG_FILL_COLORS: Record<ThreatSeverity, string> = {
  low: "#7df4ff",
  medium: "#72ff70",
  high: "#ffd166",
  critical: "#ff89ab",
};

const MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "threat-map-background",
      type: "background",
      paint: {
        "background-color": "#041015",
      },
    },
    {
      id: "threat-map-basemap",
      type: "raster",
      source: "carto-dark",
      paint: {
        "raster-opacity": 0.85,
        "raster-saturation": -0.25,
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

const heatmapColor: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(0, 0, 0, 0)",
  0.15,
  "rgba(0, 219, 233, 0.08)",
  0.3,
  "rgba(0, 219, 233, 0.16)",
  0.48,
  "rgba(19, 255, 67, 0.22)",
  0.66,
  "rgba(255, 209, 102, 0.3)",
  0.82,
  "rgba(255, 94, 120, 0.38)",
  1,
  "rgba(255, 68, 125, 0.46)",
];

type ThreatGeoJsonData = Exclude<GeoJSONSourceSpecification["data"], string>;
type ThreatMapBounds = {
  maxLat: number;
  maxLng: number;
  minLat: number;
  minLng: number;
};
const PERU_VIEW_BOUNDS = getGeoJsonBounds();
const MAP_CENTER = getBoundsCenter(PERU_VIEW_BOUNDS);

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

        registerFlagIcons(map);

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
            "fill-opacity": 0.18,
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
              0.45,
              6.5,
              0.75,
              9,
              1.15,
            ],
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              0.42,
              8,
              0.26,
              10,
              0.12,
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              14,
              6,
              22,
              8,
              30,
              10,
              38,
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
            "circle-blur": 0.7,
            "circle-color": "rgba(255, 68, 125, 0.14)",
            "circle-opacity": 0.55,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              10,
              7,
              16,
              9,
              22,
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
              8,
              8,
              14,
            ],
            "circle-stroke-color": "#dbfcff",
            "circle-stroke-width": 1.1,
          },
        });

        map.addLayer({
          id: MAP_POINTS_LAYER_ID,
          type: "symbol",
          source: MAP_SOURCE_ID,
          layout: {
            "icon-image": [
              "match",
              ["get", "severity"],
              "low",
              FLAG_ICON_IDS.low,
              "medium",
              FLAG_ICON_IDS.medium,
              "high",
              FLAG_ICON_IDS.high,
              "critical",
              FLAG_ICON_IDS.critical,
              FLAG_ICON_IDS.low,
            ],
            "icon-anchor": "bottom-left",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              0.85,
              7,
              1.05,
              9,
              1.25,
            ],
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

        fitMapToThreatViewport(map);
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
    fitMapToThreatViewport(map);
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
    <div className="relative h-[420px] overflow-hidden border border-primary/20 bg-[#04090c] pixel-corner lg:h-[540px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,219,233,0.04),transparent_40%),linear-gradient(180deg,rgba(3,9,13,0.02),rgba(3,9,13,0.44))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,219,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,219,233,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute inset-0 scanlines opacity-10" />

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

function fitMapToThreatViewport(map: MapLibreMap) {
  map.fitBounds(
    [
      [PERU_VIEW_BOUNDS.minLng, PERU_VIEW_BOUNDS.minLat],
      [PERU_VIEW_BOUNDS.maxLng, PERU_VIEW_BOUNDS.maxLat],
    ],
    {
      duration: 700,
      maxZoom: 5.9,
      padding: { top: 42, right: 42, bottom: 42, left: 42 },
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

function getGeoJsonBounds(): ThreatMapBounds {
  const feature = peruOutlineGeoJson.features[0];
  const ring =
    feature && feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : [];

  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const coordinate of ring) {
    const [longitude, latitude] = coordinate;
    minLng = Math.min(minLng, longitude);
    maxLng = Math.max(maxLng, longitude);
    minLat = Math.min(minLat, latitude);
    maxLat = Math.max(maxLat, latitude);
  }

  return {
    maxLat,
    maxLng,
    minLat,
    minLng,
  };
}

function getBoundsCenter(bounds: ThreatMapBounds): [number, number] {
  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
}

function registerFlagIcons(map: MapLibreMap) {
  (Object.keys(FLAG_ICON_IDS) as ThreatSeverity[]).forEach((severity) => {
    const id = FLAG_ICON_IDS[severity];
    if (map.hasImage(id)) {
      return;
    }
    const image = buildFlagImage(FLAG_FILL_COLORS[severity]);
    if (image) {
      map.addImage(id, image, { pixelRatio: 2 });
    }
  });
}

function buildFlagImage(fillColor: string): ImageData | null {
  if (typeof document === "undefined") {
    return null;
  }

  // 8 cols x 12 rows pixel grid. P = pole, O = outline, F = flag fill,
  // H = highlight stripe. The icon anchor (bottom-left) lands at the pole base.
  const grid = [
    "POOOOOOO",
    "PFFFFFFO",
    "PFFFFFFO",
    "PFHHHHFO",
    "PFFFFFFO",
    "POOOOOOO",
    "P.......",
    "P.......",
    "P.......",
    "P.......",
    "P.......",
    "P.......",
  ];

  const pixelScale = 3;
  const gridWidth = grid[0].length;
  const gridHeight = grid.length;
  const width = gridWidth * pixelScale;
  const height = gridHeight * pixelScale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const colors: Record<string, string> = {
    P: "#dbfcff",
    O: "#05090b",
    F: fillColor,
    H: lightenColor(fillColor, 0.35),
  };

  for (let row = 0; row < gridHeight; row += 1) {
    const line = grid[row];
    for (let col = 0; col < gridWidth; col += 1) {
      const symbol = line[col];
      const color = colors[symbol];
      if (!color) {
        continue;
      }
      ctx.fillStyle = color;
      ctx.fillRect(col * pixelScale, row * pixelScale, pixelScale, pixelScale);
    }
  }

  return ctx.getImageData(0, 0, width, height);
}

function lightenColor(hex: string, amount: number) {
  const parsed = hex.replace("#", "");
  if (parsed.length !== 6) {
    return hex;
  }
  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

