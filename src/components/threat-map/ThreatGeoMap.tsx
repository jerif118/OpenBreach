import { useEffect, useRef, useState } from "react";
import type { ThreatEntry } from "./threatMapTypes";

const SEVERITY_INTENSITY: Record<ThreatEntry["severity"], number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

export function ThreatGeoMap({
  entries,
  selectedEntryId,
  onSelectEntry,
}: {
  entries: ThreatEntry[];
  selectedEntryId: string;
  onSelectEntry: (entry: ThreatEntry) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    let isCancelled = false;

    async function initMap() {
      try {
        const maplibregl = await import("maplibre-gl");

        if (isCancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          center: [10, 15],
          zoom: 1.6,
          minZoom: 1,
          maxZoom: 12,
          dragRotate: false,
          pitchWithRotate: false,
          renderWorldCopies: true,
          style: {
            version: 8,
            sources: {
              "carto-dark": {
                type: "raster",
                tiles: [
                  "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
                  "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
                  "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
                  "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution:
                  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
              },
              "carto-labels": {
                type: "raster",
                tiles: [
                  "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
                  "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
                  "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
                  "https://d.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution: "",
              },
            },
            layers: [
              { id: "carto-dark", type: "raster", source: "carto-dark" },
              { id: "carto-labels", type: "raster", source: "carto-labels" },
            ],
          },
        });

        mapRef.current = map;

        const onLoad = () => {
          setIsMapLoaded(true);

          map.addSource("threats", {
            type: "geojson",
            data: buildThreatGeoJson(entriesRef.current),
          });

          map.addLayer({
            id: "threats-heat",
            type: "heatmap",
            source: "threats",
            paint: {
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "intensity"],
                0,
                0,
                1,
                1,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0,0,0,0)",
                0.2,
                "rgba(0, 230, 57, 0.45)",
                0.4,
                "rgba(255, 209, 102, 0.65)",
                0.6,
                "rgba(255, 138, 91, 0.78)",
                0.8,
                "rgba(255, 180, 171, 0.9)",
                1,
                "rgba(255, 84, 112, 1)",
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                1,
                1,
                6,
                2.2,
                10,
                3.4,
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                1,
                24,
                4,
                40,
                8,
                64,
              ],
              "heatmap-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                1,
                0.85,
                10,
                0.5,
              ],
            },
          });

          map.addLayer({
            id: "threats-circles",
            type: "circle",
            source: "threats",
            paint: {
              "circle-color": [
                "match",
                ["get", "severity"],
                "low",
                "#00e639",
                "medium",
                "#ffd166",
                "high",
                "#ff8a5b",
                "critical",
                "#ffb4ab",
                "#dbfcff",
              ],
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                1,
                4,
                4,
                6,
                8,
                10,
              ],
              "circle-stroke-color": "#dbfcff",
              "circle-stroke-width": 1.2,
              "circle-opacity": 0.95,
            },
          });

          map.on("click", "threats-circles", (e) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const entryId = feature.properties?.id as string | undefined;
            if (!entryId) return;
            const entry = entriesRef.current.find((en) => en.id === entryId);
            if (entry) onSelectEntry(entry);
          });

          map.on("mouseenter", "threats-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "threats-circles", () => {
            map.getCanvas().style.cursor = "";
          });
        };

        if (map.loaded()) {
          onLoad();
        } else {
          map.once("load", onLoad);
        }
      } catch (err) {
        console.error("[ThreatGeoMap] init failed:", err);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onSelectEntry]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const source = mapRef.current.getSource("threats") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) {
      source.setData(buildThreatGeoJson(entries));
    }
  }, [entries, isMapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    mapRef.current.setPaintProperty(
      "threats-circles",
      "circle-stroke-width",
      selectedEntryId ? 2.4 : 1.2,
    );
  }, [selectedEntryId, isMapLoaded]);

  const hasUserSelectedRef = useRef(false);
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !selectedEntryId) return;
    if (!hasUserSelectedRef.current) {
      hasUserSelectedRef.current = true;
      return;
    }
    const entry = entriesRef.current.find((en) => en.id === selectedEntryId);
    if (!entry) return;
    mapRef.current.flyTo({
      center: [entry.lng, entry.lat],
      zoom: Math.max(mapRef.current.getZoom(), 3.4),
      duration: 900,
    });
  }, [selectedEntryId, isMapLoaded]);

  return (
    <div className="relative h-[calc(100vh-260px)] min-h-[520px] w-full overflow-hidden border border-primary/20 bg-[#05090b] pixel-corner">
      <div ref={containerRef} className="h-full w-full" />
      {!isMapLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#05090b]/85">
          <div className="border border-primary/20 bg-[#131313]/90 px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.22em] text-primary uppercase animate-pulse">
              Loading map…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function buildThreatGeoJson(entries: ThreatEntry[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: entries.map((entry) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [entry.lng, entry.lat],
      },
      properties: {
        id: entry.id,
        severity: entry.severity,
        title: entry.title,
        intensity: SEVERITY_INTENSITY[entry.severity],
      },
    })),
  };
}
