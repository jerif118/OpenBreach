import { Link, createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import {
  type DashboardMunicipalityState,
  getDashboardMunicipalitySource,
  getMockDashboardMunicipalityState,
} from "../features/dashboard/dashboard-data.ts";
import { MexicoRiskMap } from "../features/dashboard/mexico-risk-map.tsx";
import { getRiskDisplay, riskLegend } from "../features/dashboard/risk-display.ts";
import { useConvexDashboardMunicipalities } from "../features/dashboard/use-dashboard-municipalities.ts";
import type { MunicipalityListItem, RiskLevel } from "../shared/contracts.ts";

export const Route = createFileRoute("/")({
  component: Home,
  errorComponent: DashboardRouteError,
});

function Home() {
  const source = getDashboardMunicipalitySource(import.meta.env.VITE_CONVEX_URL);

  return (
    <DashboardFrame>
      {source === "convex" ? <ConvexDashboard /> : <MockDashboard />}
    </DashboardFrame>
  );
}

function DashboardRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const message = error.message || "The live Convex municipality query failed.";

  return (
    <DashboardFrame>
      <DashboardShell state={{ status: "error", source: "convex", items: [], message }} />
      <div className="pb-5">
        <button
          type="button"
          className="rounded-full border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          onClick={reset}
        >
          Retry dashboard query
        </button>
      </div>
    </DashboardFrame>
  );
}

function DashboardFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_34rem),linear-gradient(135deg,_#020617_0%,_#0f172a_52%,_#111827_100%)] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-cyan-300">
              DEFF-ACC
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Municipal risk command center
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Mexico-focused cybersecurity exposure for judges and municipal teams, with live-ready data regions for the risk map and priority queue.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100 shadow-xl shadow-cyan-950/30">
            <span className="block font-semibold">Public dashboard</span>
            <span className="text-cyan-100/80">Map, ranked list, and legend stay visible across data states.</span>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function ConvexDashboard() {
  const state = useConvexDashboardMunicipalities();

  return <DashboardShell state={state} />;
}

function MockDashboard() {
  return <DashboardShell state={getMockDashboardMunicipalityState()} />;
}

function DashboardShell({ state }: { state: DashboardMunicipalityState }) {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | "all">("all");
  const [selectedState, setSelectedState] = useState("all");
  const readyItems = state.status === "ready" ? state.items : [];
  const filteredItems = getFilteredMunicipalities(readyItems, selectedRiskLevel, selectedState);
  const filteredState: DashboardMunicipalityState = state.status === "ready" ? { ...state, items: filteredItems } : state;
  const rankedItems = getRankedMunicipalities(filteredItems);
  const stateOptions = [...new Set(readyItems.map((item) => item.state))].sort((a, b) => a.localeCompare(b));
  const hasActiveFilters = selectedRiskLevel !== "all" || selectedState !== "all";
  const totalRows = filteredItems.length;

  const clearFilters = () => {
    setSelectedRiskLevel("all");
    setSelectedState("all");
  };

  return (
    <div className="grid flex-1 gap-4 py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] lg:items-stretch">
      <section className="flex min-h-[440px] flex-col rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-6 lg:min-h-[680px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Mexico risk map
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Geographic exposure view
            </h2>
          </div>
          <SourceBadge state={state} />
        </div>
        <DashboardFilters
          hasActiveFilters={hasActiveFilters}
          matchedCount={filteredItems.length}
          onClearFilters={clearFilters}
          onRiskLevelChange={setSelectedRiskLevel}
          onStateChange={setSelectedState}
          readyCount={readyItems.length}
          selectedRiskLevel={selectedRiskLevel}
          selectedState={selectedState}
          stateOptions={stateOptions}
        />
        <MexicoRiskMap state={filteredState} totalRows={totalRows} />
      </section>

      <aside className="grid gap-4 lg:grid-rows-[auto_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
            Ranked risk queue
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Highest-priority municipalities</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Highest-risk municipalities stay defensively sorted and link to the detail route for demo-safe follow-up.
          </p>
          <RankedRiskList state={filteredState} items={rankedItems} />
        </section>

        <RiskLegend />
      </aside>
    </div>
  );
}

function DashboardFilters({
  hasActiveFilters,
  matchedCount,
  onClearFilters,
  onRiskLevelChange,
  onStateChange,
  readyCount,
  selectedRiskLevel,
  selectedState,
  stateOptions,
}: {
  hasActiveFilters: boolean;
  matchedCount: number;
  onClearFilters: () => void;
  onRiskLevelChange: (riskLevel: RiskLevel | "all") => void;
  onStateChange: (state: string) => void;
  readyCount: number;
  selectedRiskLevel: RiskLevel | "all";
  selectedState: string;
  stateOptions: string[];
}) {
  const filteredEmpty = readyCount > 0 && hasActiveFilters && matchedCount === 0;

  return (
    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="risk-level-filter">
          Risk level
          <select
            id="risk-level-filter"
            className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/40"
            value={selectedRiskLevel}
            onChange={(event) => onRiskLevelChange(event.target.value as RiskLevel | "all")}
          >
            <option value="all">All risk levels</option>
            {riskLegend.map((item) => (
              <option key={item.level} value={item.level}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="state-filter">
          State
          <select
            id="state-filter"
            className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/40"
            value={selectedState}
            onChange={(event) => onStateChange(event.target.value)}
          >
            <option value="all">All states</option>
            {stateOptions.map((stateName) => (
              <option key={stateName} value={stateName}>{stateName}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="rounded-full border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 transition enabled:hover:border-cyan-200 enabled:hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          disabled={!hasActiveFilters}
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        Showing {matchedCount} of {readyCount} municipalities.
      </p>
      {filteredEmpty ? (
        <div className="mt-3 rounded-2xl border border-amber-200/20 bg-amber-200/10 p-3 text-sm leading-6 text-amber-100">
          <p className="font-semibold text-amber-50">No municipalities match the active filters.</p>
          <button type="button" className="mt-2 font-semibold underline decoration-amber-100/50 underline-offset-4" onClick={onClearFilters}>
            Show all municipalities
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SourceBadge({ state }: { state: DashboardMunicipalityState }) {
  const label = state.source === "convex" ? "Live Convex data" : "Demo mock data";
  const toneClassName = state.source === "convex" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-amber-200/30 bg-amber-200/10 text-amber-100";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>
      <p className="font-semibold">{label}</p>
      <p className="mt-1 opacity-85">{getDashboardStateDescription(state)}</p>
    </div>
  );
}

function RankedRiskList({ state, items }: { state: DashboardMunicipalityState; items: MunicipalityListItem[] }) {
  if (state.status !== "ready") {
    return (
      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">{getStatePanelTitle(state)}</p>
        <p className="mt-2 leading-6">{getStatePanelCopy(state)}</p>
      </div>
    );
  }

  return (
    <ol className="mt-5 grid gap-3">
      {items.map((item, index) => {
        const legendItem = getRiskDisplay(item.riskLevel);

        return (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/55 transition hover:border-cyan-300/40 hover:bg-slate-900/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Rank {index + 1}
                </p>
                <p className="mt-2 font-semibold text-white">{item.name}</p>
                <p className="text-sm text-slate-400">{item.state}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-white">{item.riskScore}</p>
                <p className={`text-sm font-medium ${legendItem.textClassName}`}>{legendItem.label}</p>
              </div>
            </div>
            <Link
              to="/municipalities/$id"
              params={{ id: item.id }}
              className="mt-4 inline-flex rounded-full border border-cyan-300/30 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              Open detail
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function RiskLegend() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/20 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
        Risk legend
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Marker color meanings</h2>
      <div className="mt-5 grid gap-3">
        {riskLegend.map((item) => (
          <div key={item.level} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <span className={`mt-1 h-4 w-4 shrink-0 rounded-full shadow-lg ${item.swatchClassName}`} aria-hidden="true" />
            <div>
              <p className={`font-semibold ${item.textClassName}`}>{item.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-300">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getRankedMunicipalities(items: MunicipalityListItem[]) {
  return [...items].sort((a, b) => b.riskScore - a.riskScore);
}

function getFilteredMunicipalities(
  items: MunicipalityListItem[],
  selectedRiskLevel: RiskLevel | "all",
  selectedState: string,
) {
  return items.filter((item) => {
    const riskLevelMatches = selectedRiskLevel === "all" || item.riskLevel === selectedRiskLevel;
    const stateMatches = selectedState === "all" || item.state === selectedState;

    return riskLevelMatches && stateMatches;
  });
}

function getDashboardStateDescription(state: DashboardMunicipalityState) {
  switch (state.status) {
    case "loading":
      return "Loading public municipality risk rows from api.municipalities.list.";
    case "ready":
      return `${state.items.length} municipality risk rows are available for the dashboard.`;
    case "empty":
      return "No municipality risk rows are available yet.";
    case "error":
      return "The dashboard data source reported an error.";
  }
}

function getStatePanelTitle(state: DashboardMunicipalityState) {
  switch (state.status) {
    case "loading":
      return "Loading dashboard data";
    case "empty":
      return "No municipality risk rows are available yet";
    case "error":
      return "The dashboard data source reported an error";
    case "ready":
      return "Municipality rows ready";
  }
}

function getStatePanelCopy(state: DashboardMunicipalityState) {
  switch (state.status) {
    case "loading":
      return "The ranked queue keeps its space while the live Convex query resolves.";
    case "empty":
      return "The dashboard shell is still usable and ready for seeded or live data.";
    case "error":
      return state.message || "The shell stays visible so the source issue can be diagnosed.";
    case "ready":
      return "Municipality rows are ready for the ranked queue.";
  }
}
