import { ThreatMapPanel } from "../../components/threat-map/ThreatMapPanel";

export function OpenBreachDashboard() {
  return (
    <div className="space-y-8">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-primary/20 pb-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display flex items-center gap-3 text-xl tracking-[0.14em] text-[#00dbe9] uppercase lg:text-2xl">
            <span className="material-symbols-outlined text-2xl lg:text-3xl">
              travel_explore
            </span>
            OpenBreach Control Plane
          </h1>
          <p className="mt-2 font-mono text-[10px] text-[#b9cacb] lg:text-xs">
            Live visibility for approved assets, validation status, and response
            posture.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-[#00e639]/30 bg-[#13ff43]/10 px-3 py-1 font-mono text-[10px] text-[#00e639] pixel-corner lg:text-xs">
          <span className="block h-2 w-2 bg-[#00e639] crt-glow" />
          MONITORING_ACTIVE
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Approved Assets" value="1,024" />
        <MetricCard label="Active Checks" value="8,192" />
        <MetricCard
          icon="warning"
          label="Critical Alerts"
          value="03"
          variant="error"
        />
        <MetricCard label="Coverage" value="96%" variant="green" />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ThreatMapPanel />

          <div className="relative overflow-hidden border border-primary/15 bg-[#2a2a2a] p-4">
            <div className="absolute inset-0 scanlines opacity-20" />
            <div className="relative z-10">
              <h3 className="font-display mb-4 flex items-center gap-2 border-b border-primary/20 pb-2 text-base text-primary uppercase lg:text-lg">
                <span className="material-symbols-outlined">history</span>
                Recent Validations
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] lg:text-xs">
                  <thead>
                    <tr className="border-b border-primary/10 text-[#b9cacb]">
                      <th className="px-2 py-2 font-normal">ID</th>
                      <th className="border-l border-primary/10 px-2 py-2 font-normal">
                        TARGET
                      </th>
                      <th className="border-l border-primary/10 px-2 py-2 font-normal">
                        DURATION
                      </th>
                      <th className="border-l border-primary/10 px-2 py-2 font-normal">
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <ValidationRow
                      duration="00:04:12"
                      id="run_0x8F2"
                      status="CLEARED"
                      statusTone="green"
                      target="public-api.prod"
                    />
                    <ValidationRow
                      duration="00:01:45"
                      id="run_0x8F1"
                      status="REVIEW"
                      statusTone="red"
                      target="identity.edge"
                    />
                    <ValidationRow
                      duration="00:12:30"
                      id="run_0x8F0"
                      status="RUNNING"
                      statusTone="cyan"
                      target="citizen-portal"
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden border border-[#ffb4ab]/40 bg-[#2a2a2a] p-4">
            <div className="absolute left-0 top-0 h-1 w-full bg-[#ffb4ab]/50" />
            <h3 className="font-display mb-4 flex items-center gap-2 text-base text-[#ffb4ab] uppercase lg:text-lg">
              <span className="material-symbols-outlined">gpp_bad</span>
              Live Alerts
            </h3>
            <div className="flex flex-col gap-3 font-mono text-[10px]">
              <AlertCard
                body="Header baseline drift detected on public-api.prod"
                timestamp="10:38:22"
                title="POLICY_MISMATCH"
              />
              <AlertCard
                body="Auth callback exposed a permissive redirect pattern"
                timestamp="09:15:04"
                title="REDIRECT_ANOMALY"
              />
              <AlertCard
                body="Rate limit backlog building on citizen-portal uploads"
                timestamp="08:42:11"
                title="QUEUE_PRESSURE"
              />
            </div>
          </div>

          <div className="border border-primary/30 bg-[#131313] p-4">
            <p className="mb-2 font-mono text-[10px] text-primary">
              &gt;_ OpenBreach_Command
            </p>
            <div className="flex overflow-hidden border border-primary/50 pixel-corner transition-colors focus-within:border-primary">
              <span className="flex items-center bg-primary/10 px-3 py-2 font-mono text-primary">
                $
              </span>
              <input
                className="w-full border-none bg-transparent font-mono text-[10px] text-[#00dbe9] placeholder:text-primary/30 focus:ring-0 lg:text-xs"
                placeholder="run approved validation..."
                type="text"
              />
              <button className="material-symbols-outlined bg-primary/20 px-3 text-primary transition-colors hover:bg-primary hover:text-[#00363a]">
                keyboard_return
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  variant,
  icon,
}: {
  label: string;
  value: string;
  variant?: "default" | "error" | "green";
  icon?: string;
}) {
  const isError = variant === "error";
  const isGreen = variant === "green";

  return (
    <div
      className={`group relative overflow-hidden border border-primary/15 bg-[#2a2a2a] p-4 ${isError ? "border-[#ffb4ab]/30 bg-[#ffb4ab]/5" : ""}`}
    >
      <div className="absolute inset-0 scanlines opacity-30" />
      <div className="absolute left-0 top-0 h-1 w-1 bg-primary/50" />
      <p
        className={`relative z-10 mb-2 font-mono text-[10px] uppercase ${isError ? "text-[#ffb4ab]" : "text-[#b9cacb]"}`}
      >
        {icon ? (
          <span className="material-symbols-outlined mr-1 text-sm">{icon}</span>
        ) : null}
        {label}
      </p>
      <p
        className={`font-display relative z-10 text-xl transition-all group-hover:crt-glow lg:text-2xl ${isError ? "text-[#ffb4ab]" : isGreen ? "text-[#00e639]" : "text-[#00dbe9]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ValidationRow({
  id,
  target,
  duration,
  status,
  statusTone,
}: {
  id: string;
  target: string;
  duration: string;
  status: string;
  statusTone: "green" | "red" | "cyan";
}) {
  const toneClassName =
    statusTone === "green"
      ? "border-[#ecffe3] bg-[#ecffe3]/10 text-[#00e639]"
      : statusTone === "red"
        ? "border-[#ffb4ab] bg-[#ffb4ab]/10 text-[#ffb4ab]"
        : "border-primary bg-primary/10 text-[#00dbe9]";

  return (
    <tr className="transition-colors hover:bg-primary/5">
      <td className="px-2 py-3 text-[#00dbe9]">{id}</td>
      <td className="px-2 py-3">{target}</td>
      <td className="border-l border-primary/10 px-2 py-3 text-[#b9cacb]">
        {duration}
      </td>
      <td className="border-l border-primary/10 px-2 py-3">
        <span
          className={`inline-flex items-center gap-2 border px-2 py-1 pixel-corner ${toneClassName}`}
        >
          {status}
          {statusTone === "cyan" ? (
            <span className="h-1 w-1 animate-ping rounded-full bg-current" />
          ) : null}
        </span>
      </td>
    </tr>
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
    <div className="border-l-2 border-[#ffb4ab] bg-[#ffb4ab]/5 py-1 pl-3 transition-colors hover:bg-[#ffb4ab]/10">
      <p className="mb-1 text-[#ffb4ab] crt-glow">[{timestamp}] {title}</p>
      <p className="text-[#b9cacb]">{body}</p>
      <button
        className="mt-2 text-[10px] text-[#00dbe9] uppercase hover:underline"
        type="button"
      >
        Investigate &gt;&gt;
      </button>
    </div>
  );
}
