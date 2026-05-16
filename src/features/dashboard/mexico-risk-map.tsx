import type { MunicipalityListItem } from "../../shared/contracts.ts";
import type { DashboardMunicipalityState } from "./dashboard-data.ts";
import { getRiskDisplay } from "./risk-display.ts";

export const MEXICO_LONGITUDE_RANGE = { min: -118.5, max: -86.5 };
export const MEXICO_LATITUDE_RANGE = { min: 14, max: 33.5 };

export function MexicoRiskMap({
  state,
  totalRows,
}: {
  state: DashboardMunicipalityState;
  totalRows: number;
}) {
  const markers = state.status === "ready" ? getProjectedMarkers(state.items) : [];
  const omittedCount = state.status === "ready" ? state.items.length - markers.length : 0;

  return (
    <div className="relative mt-5 flex flex-1 overflow-hidden rounded-[1.5rem] border border-cyan-300/15 bg-slate-950/70 p-5 sm:p-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative z-10 flex min-h-[300px] w-full flex-col justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-cyan-100">Map-ready surface</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Municipality markers use approximate Mexico-relative positions when coordinate data is available. The panel remains sized while {getMapStateCopy(state)}
          </p>
        </div>

        <div
          className="relative min-h-[300px] flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-cyan-950/25 shadow-[inset_0_0_70px_rgba(14,165,233,0.12)]"
          role="region"
          aria-label="Mexico municipality risk marker map"
        >
          <MexicoBasemap />
          {markers.map(({ item, x, y }) => {
            const riskDisplay = getRiskDisplay(item.riskLevel);
            const markerLabel = `${item.name}, ${item.state}. Risk score ${item.riskScore}. ${riskDisplay.label}.`;

            return (
              <button
                key={item.id}
                type="button"
                tabIndex={0}
                aria-label={markerLabel}
                title={markerLabel}
                className={`group absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg outline-none transition hover:scale-125 focus:scale-125 focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-slate-950 ${riskDisplay.markerClassName}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <span className="sr-only">{markerLabel}</span>
                <span className="pointer-events-none absolute left-1/2 top-6 hidden min-w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-left text-xs text-slate-200 shadow-xl group-hover:block group-focus:block">
                  <span className="block font-semibold text-white">{item.name}</span>
                  <span className="block text-slate-400">{item.state}</span>
                  <span className={`mt-1 block font-medium ${riskDisplay.textClassName}`}>{riskDisplay.label} · {item.riskScore}</span>
                </span>
              </button>
            );
          })}
          {state.status === "ready" && markers.length === 0 ? (
            <div className="absolute inset-x-4 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-950/85 p-4 text-center text-sm text-slate-300">
              <p className="font-semibold text-white">No positionable municipality markers</p>
              <p className="mt-2 leading-6">Rows loaded, but none include usable latitude and longitude.</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricPill label="Rows available" value={String(totalRows)} />
          <MetricPill label="Markers shown" value={String(markers.length)} />
          <MetricPill label="Omitted" value={String(Math.max(omittedCount, 0))} />
        </div>
        {omittedCount > 0 ? (
          <p className="rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm leading-6 text-amber-100">
            {omittedCount} municipality {omittedCount === 1 ? "row was" : "rows were"} omitted from the map because coordinates are missing or invalid.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MexicoBasemap() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" role="img" aria-label="Approximate outline of Mexico">
      <defs>
        <linearGradient id="mexico-map-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(34 211 238 / 0.2)" />
          <stop offset="100%" stopColor="rgb(14 165 233 / 0.06)" />
        </linearGradient>
      </defs>
      <path
        d="M9 23 C18 15 29 17 38 25 C45 31 50 37 59 36 C69 35 78 38 86 47 C93 55 93 66 85 72 C75 80 62 76 53 69 C44 62 35 61 27 55 C16 47 4 38 9 23 Z"
        fill="url(#mexico-map-fill)"
        stroke="rgb(125 211 252 / 0.36)"
        strokeWidth="0.8"
      />
      <path
        d="M18 22 C25 31 31 40 39 49 M40 25 C47 40 57 53 72 66 M57 38 C65 44 76 47 87 48"
        fill="none"
        stroke="rgb(148 163 184 / 0.18)"
        strokeWidth="0.7"
      />
    </svg>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function getProjectedMarkers(items: MunicipalityListItem[]) {
  return items.flatMap((item) => {
    const position = projectMexicoCoordinate(item.latitude, item.longitude);
    return position ? [{ item, ...position }] : [];
  });
}

export function projectMexicoCoordinate(
  latitude: number | undefined,
  longitude: number | undefined,
) {
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const x = ((longitude - MEXICO_LONGITUDE_RANGE.min) / (MEXICO_LONGITUDE_RANGE.max - MEXICO_LONGITUDE_RANGE.min)) * 100;
  const y = ((MEXICO_LATITUDE_RANGE.max - latitude) / (MEXICO_LATITUDE_RANGE.max - MEXICO_LATITUDE_RANGE.min)) * 100;

  return {
    x: clamp(x, 6, 94),
    y: clamp(y, 8, 92),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMapStateCopy(state: DashboardMunicipalityState) {
  switch (state.status) {
    case "loading":
      return "loading public municipality risk rows.";
    case "ready":
      return "available rows are projected into marker positions.";
    case "empty":
      return "no municipality risk rows are available yet.";
    case "error":
      return "the dashboard data source reported an error.";
  }
}
