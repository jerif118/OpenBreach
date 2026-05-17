import { useEffect, useRef, useState } from "react";
import type { ThreatEntry } from "./threatMapTypes";
import { peruOutlineGeoJson } from "./peruOutlineGeoJson";

const SOUTH_PERU_BOUNDS = {
  maxLat: -11.2,
  maxLng: -68.6,
  minLat: -19.1,
  minLng: -76.9,
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
    console.log("[ThreatGeoMap] Effect running, container:", containerRef.current);
    if (!containerRef.current || mapRef.current) {
      console.log("[ThreatGeoMap] Skipping - no container or map already exists");
      return;
    }

    let map: maplibregl.Map;
    let isCancelled = false;

    async function initMap() {
      try {
        console.log("[ThreatGeoMap] Starting map initialization...");
        const maplibregl = await import("maplibre-gl");
        console.log("[ThreatGeoMap] maplibre-gl imported:", !!maplibregl.Map);

        if (isCancelled || !containerRef.current) {
          console.log("[ThreatGeoMap] Component unmounted during import, aborting map init");
          return;
        }

        map = new maplibregl.Map({
          container: containerRef.current!,
          center: [-71.6, -15.35],
          zoom: 5.3,
          minZoom: 4,
          maxZoom: 10,
          dragRotate: false,
          pitchWithRotate: false,
          style: {
            version: 8,
            sources: {
              "peru-outline": {
                type: "geojson",
                data: peruOutlineGeoJson as unknown as GeoJSON.FeatureCollection,
              },
            },
            layers: [
              {
                id: "peru-fill",
                type: "fill",
                source: "peru-outline",
                paint: {
                  "fill-color": "#204655", // Brighter so we can see it
                  "fill-opacity": 0.55,
                },
              },
              {
                id: "peru-line",
                type: "line",
                source: "peru-outline",
                paint: {
                  "line-color": "#58edf8",
                  "line-opacity": 0.8,
                  "line-width": 2,
                },
              },
            ],
          },
        });

        mapRef.current = map;
        console.log("[ThreatGeoMap] Map created, mapRef set");

        if (map.loaded()) {
          console.log("[ThreatGeoMap] Map already loaded, calling load handler directly");
          handleMapLoad();
        } else {
          map.once("load", () => {
            console.log("[ThreatGeoMap] Map load event fired");
            handleMapLoad();
          });
        }

        function handleMapLoad() {
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
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(0, 0, 0, 0)",
                0.15, "rgba(0, 219, 233, 0.18)",
                0.3, "rgba(19, 255, 67, 0.34)",
                0.5, "rgba(255, 209, 102, 0.64)",
                0.72, "rgba(255, 94, 120, 0.82)",
                1, "rgba(255, 68, 125, 0.98)",
              ],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.85, 9, 2.1],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 22, 10, 70],
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
                "low", "#00dbe9",
                "medium", "#00e639",
                "high", "#ffd166",
                "critical", "#ff6b98",
                "#dbfcff",
              ],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 8, 12],
              "circle-stroke-color": "#dbfcff",
              "circle-stroke-width": 1,
              "circle-opacity": 0.85,
            },
          });

          map.on("click", "threats-circles", (e) => {
            if (e.features && e.features[0]) {
              const entryId = e.features[0].properties?.id;
              const entry = entriesRef.current.find((en) => en.id === entryId);
              if (entry) {
                onSelectEntry(entry);
              }
            }
          });

          map.on("mouseenter", "threats-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "threats-circles", () => {
            map.getCanvas().style.cursor = "";
          });

          fitMapToEntries(map, entriesRef.current);
        }
      } catch (err) {
        console.error("Error initializing map:", err);
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
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const source = mapRef.current.getSource("threats") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(buildThreatGeoJson(entries));
    }
  }, [entries, isMapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    mapRef.current.setPaintProperty(
      "threats-circles",
      "circle-stroke-width",
      selectedEntryId ? 2.5 : 1
    );
    mapRef.current.setPaintProperty(
      "threats-circles",
      "circle-stroke-color",
      selectedEntryId ? "#dbfcff" : "#dbfcff"
    );
  }, [selectedEntryId, isMapLoaded]);

  return (
    <div className="relative h-[420px] overflow-hidden border border-primary/20 bg-[#05090b] pixel-corner lg:h-[540px]">
      <div ref={containerRef} className="absolute inset-0" />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#05090b]">
          <div className="border border-primary/20 bg-[#131313]/90 px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.22em] text-primary uppercase animate-pulse">
              Loading map...
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
      },
    })),
  };
}

function fitMapToEntries(map: maplibregl.Map, entries: ThreatEntry[]) {
  if (!entries.length) return;

  if (entries.length === 1) {
    map.flyTo({
      center: [entries[0].lng, entries[0].lat],
      zoom: 7,
      duration: 1000,
    });
    return;
  }

  const lngs = entries.map((e) => e.lng);
  const lats = entries.map((e) => e.lat);

  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    {
      padding: 50,
      maxZoom: 7,
      duration: 1000,
    }
  );
}