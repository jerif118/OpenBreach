import { Link } from "@tanstack/react-router";

import { ThreatMapPanel } from "../../components/threat-map/ThreatMapPanel";
import {
  formatTimestamp,
  formatWorkflowPhase,
  formatWorkflowStatus,
} from "./pipeline-data";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import {
  getTargetLastUpdated,
  getTargetStatusTone,
} from "../../hooks/use-openbreach-pipeline";

export function OpenBreachDashboard() {
  const {
    alerts,
    metrics,
    recentValidations,
    reportDownloads,
    stageSummary,
    targets,
    isLoading,
  } = useDashboardData();

  return (
    <div className="space-y-8">
      <header className="border-primary/20 flex flex-col justify-between gap-4 border-b pb-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="font-display flex items-center gap-3 text-xl tracking-[0.14em] text-[#00dbe9] uppercase lg:text-2xl">
            <span className="material-symbols-outlined text-2xl lg:text-3xl">
              travel_explore
            </span>
            Open Breach Control Plane
          </h1>
          <p className="mt-2 font-mono text-[10px] text-[#b9cacb] lg:text-xs">
            Authorized intake, passive evidence, approval gates, validation, and
            report delivery in one operational dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="pixel-corner flex items-center gap-2 border border-[#00e639]/30 bg-[#13ff43]/10 px-3 py-1 font-mono text-[10px] text-[#00e639] lg:text-xs">
            <span className="crt-glow block h-2 w-2 bg-[#00e639]" />
            PIPELINE_ACTIVE
          </div>
          <Link
            className="border-primary/40 text-primary pixel-corner hover:bg-primary/10 border px-3 py-2 font-mono text-[10px] uppercase transition-colors lg:text-xs"
            to="/targets/new"
          >
            Register Target
          </Link>
          <Link
            className="pixel-corner border border-[#00e639]/30 px-3 py-2 font-mono text-[10px] text-[#00e639] uppercase transition-colors hover:bg-[#00e639]/10 lg:text-xs"
            to="/guardian/reports"
          >
            Open Reports
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Targets In Scope"
          value={
            isLoading || !metrics ? "--" : metrics.targetsInScope.toString()
          }
        />
        <MetricCard
          label="Pending Actions"
          value={isLoading || !metrics ? "--" : metrics.pendingGates.toString()}
        />
        <MetricCard
          label="Reports Ready"
          tone="green"
          value={isLoading || !metrics ? "--" : metrics.reportsReady.toString()}
        />
        <MetricCard
          label="Coverage"
          tone="cyan"
          value={isLoading || !metrics ? "--" : `${metrics.coverage}%`}
        />
      </section>

      <ThreatMapPanel />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-4">
          <section className="border-primary/15 relative overflow-hidden border bg-[#2a2a2a] p-4">
            <div className="scanlines absolute inset-0 opacity-20" />
            <div className="relative z-10">
              <div className="border-primary/10 mb-4 flex items-center justify-between gap-4 border-b pb-3">
                <h2 className="font-display text-primary text-base uppercase lg:text-lg">
                  Pipeline Flow
                </h2>
                <Link
                  className="text-primary/70 hover:text-primary font-mono text-[10px] uppercase"
                  to="/guardian/validations"
                >
                  Review validations
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {stageSummary.map((stage) => (
                  <div
                    key={stage.label}
                    className="border-primary/10 border bg-[#131313]/80 p-4"
                  >
                    <p className="font-mono text-[10px] text-[#b9cacb] uppercase">
                      {stage.label}
                    </p>
                    <p className="font-display text-primary mt-3 text-2xl">
                      {stage.value.toString().padStart(2, "0")}
                    </p>
                    <div className="bg-primary/10 mt-4 h-1">
                      <div
                        className="h-full bg-[linear-gradient(90deg,_rgba(0,230,57,0.95),_rgba(0,219,233,0.55))]"
                        style={{
                          width: `${targets.length ? Math.min(100, Math.round((stage.value / targets.length) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-primary/15 relative overflow-hidden border bg-[#2a2a2a] p-4">
            <div className="scanlines absolute inset-0 opacity-20" />
            <div className="relative z-10">
              <div className="border-primary/10 mb-4 flex items-center justify-between gap-4 border-b pb-3">
                <h2 className="font-display text-primary text-base uppercase lg:text-lg">
                  Target Queue
                </h2>
                <Link
                  className="text-primary/70 hover:text-primary font-mono text-[10px] uppercase"
                  to="/targets"
                >
                  Open registry
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] lg:text-xs">
                  <thead>
                    <tr className="border-primary/10 border-b text-[#b9cacb]">
                      <th className="px-2 py-2 font-normal">TARGET</th>
                      <th className="border-primary/10 border-l px-2 py-2 font-normal">
                        PHASE
                      </th>
                      <th className="border-primary/10 border-l px-2 py-2 font-normal">
                        STATUS
                      </th>
                      <th className="border-primary/10 border-l px-2 py-2 font-normal">
                        UPDATED
                      </th>
                      <th className="border-primary/10 border-l px-2 py-2 font-normal">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.length === 0 ? (
                      <tr>
                        <td className="px-2 py-3 text-[#b9cacb]" colSpan={5}>
                          No targets available.
                        </td>
                      </tr>
                    ) : (
                      targets.slice(0, 6).map((target) => (
                        <tr
                          key={target.targetId}
                          className="hover:bg-primary/5"
                        >
                          <td className="px-2 py-3 text-[#00dbe9]">
                            <div className="flex flex-col gap-1">
                              <span>{target.name}</span>
                              <span className="text-[9px] text-[#b9cacb]">
                                {target.targetId}
                              </span>
                            </div>
                          </td>
                          <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
                            {formatWorkflowPhase(
                              target.latestRun?.currentPhase,
                            )}
                          </td>
                          <td className="border-primary/10 border-l px-2 py-3">
                            <StatusPill
                              label={formatWorkflowStatus(
                                target.latestRun?.status,
                              )}
                              tone={getTargetStatusTone(target)}
                            />
                          </td>
                          <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
                            {getTargetLastUpdated(target)}
                          </td>
                          <td className="border-primary/10 border-l px-2 py-3">
                            <Link
                              className="text-primary hover:text-[#00e639]"
                              to="/targets/$targetId"
                              params={{ targetId: target.targetId }}
                            >
                              {target.nextActionLabel}
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="relative overflow-hidden border border-[#ffb4ab]/40 bg-[#2a2a2a] p-4">
            <div className="absolute top-0 left-0 h-1 w-full bg-[#ffb4ab]/50" />
            <h2 className="font-display mb-4 flex items-center gap-2 text-base text-[#ffb4ab] uppercase lg:text-lg">
              <span className="material-symbols-outlined">gpp_bad</span>
              Live Alerts
            </h2>
            <div className="flex flex-col gap-3 font-mono text-[10px]">
              {alerts.length === 0 ? (
                <AlertCard
                  body="No critical alerts are active in the current snapshot."
                  timestamp="--"
                  title="PIPELINE_CLEAR"
                />
              ) : (
                alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    body={alert.body}
                    timestamp={formatTimestamp(alert.timestamp)}
                    title={alert.title}
                  />
                ))
              )}
            </div>
          </section>

          <section className="border-primary/15 border bg-[#2a2a2a] p-4">
            <div className="border-primary/10 mb-4 flex items-center justify-between gap-4 border-b pb-3">
              <h2 className="font-display text-primary text-base uppercase lg:text-lg">
                Recent Validations
              </h2>
              <Link
                className="text-primary/70 hover:text-primary font-mono text-[10px] uppercase"
                to="/guardian/validations"
              >
                Open queue
              </Link>
            </div>
            <div className="space-y-3">
              {recentValidations.length === 0 ? (
                <p className="font-mono text-[10px] text-[#b9cacb]">
                  No validations available.
                </p>
              ) : (
                recentValidations.slice(0, 4).map((validation) => (
                  <div
                    key={validation.id}
                    className="border-primary/10 border bg-[#131313]/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] text-[#00dbe9]">
                          {validation.id}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[#b9cacb]">
                          {validation.target}
                        </p>
                      </div>
                      <StatusPill
                        label={validation.status}
                        tone={validation.statusTone}
                      />
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-[#b9cacb]">
                      Duration: {validation.duration}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="border-primary/15 border bg-[#2a2a2a] p-4">
            <div className="border-primary/10 mb-4 flex items-center justify-between gap-4 border-b pb-3">
              <h2 className="font-display text-primary text-base uppercase lg:text-lg">
                Report Downloads
              </h2>
              <Link
                className="text-primary/70 hover:text-primary font-mono text-[10px] uppercase"
                to="/guardian/reports"
              >
                View library
              </Link>
            </div>
            <div className="space-y-3">
              {reportDownloads.slice(0, 4).map((download) => (
                <a
                  key={download.id}
                  className="border-primary/10 text-primary hover:bg-primary/10 flex items-center justify-between gap-3 border bg-[#131313]/70 px-3 py-3 font-mono text-[10px] transition-colors"
                  href={download.href}
                >
                  <span>{download.label}</span>
                  <span className="material-symbols-outlined text-sm">
                    download
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "cyan";
}) {
  const toneClassName =
    tone === "green"
      ? "text-[#00e639]"
      : tone === "cyan"
        ? "text-[#00dbe9]"
        : "text-white";

  return (
    <div className="group border-primary/15 relative overflow-hidden border bg-[#2a2a2a] p-4">
      <div className="scanlines absolute inset-0 opacity-30" />
      <p className="relative z-10 mb-2 font-mono text-[10px] text-[#b9cacb] uppercase">
        {label}
      </p>
      <p
        className={`font-display group-hover:crt-glow relative z-10 text-xl transition-all lg:text-2xl ${toneClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red" | "cyan" | "amber";
}) {
  const toneClassName =
    tone === "green"
      ? "border-[#ecffe3] bg-[#ecffe3]/10 text-[#00e639]"
      : tone === "red"
        ? "border-[#ffb4ab] bg-[#ffb4ab]/10 text-[#ffb4ab]"
        : tone === "amber"
          ? "border-[#ffd580] bg-[#ffd580]/10 text-[#ffd580]"
          : "border-primary bg-primary/10 text-[#00dbe9]";

  return (
    <span
      className={`pixel-corner inline-flex items-center gap-2 border px-2 py-1 ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function AlertCard({
  title,
  timestamp,
  body,
}: {
  title: string;
  timestamp: string;
  body: string;
}) {
  return (
    <div className="border border-[#ffb4ab]/20 bg-[#131313]/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-[#ffb4ab]">{title}</p>
        <p className="font-mono text-[10px] text-[#b9cacb]">{timestamp}</p>
      </div>
      <p className="mt-2 font-mono text-[10px] leading-5 text-[#e5e2e1]">
        {body}
      </p>
    </div>
  );
}
