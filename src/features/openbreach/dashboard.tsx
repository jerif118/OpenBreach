import { useState } from "react";

type ThreatNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  severity: "critical" | "elevated" | "stable";
  threats: number;
  traffic: string;
  coverage: string;
};

const threatNodes: ThreatNode[] = [
  {
    id: "gateway",
    label: "API Gateway",
    x: 18,
    y: 34,
    severity: "critical",
    threats: 3,
    traffic: "2.8 Gbps",
    coverage: "86%",
  },
  {
    id: "identity",
    label: "Identity",
    x: 40,
    y: 22,
    severity: "elevated",
    threats: 1,
    traffic: "1.1 Gbps",
    coverage: "93%",
  },
  {
    id: "reports",
    label: "Reports",
    x: 68,
    y: 28,
    severity: "stable",
    threats: 0,
    traffic: "640 Mbps",
    coverage: "98%",
  },
  {
    id: "storage",
    label: "Storage",
    x: 76,
    y: 58,
    severity: "stable",
    threats: 0,
    traffic: "410 Mbps",
    coverage: "96%",
  },
  {
    id: "edge",
    label: "Edge Nodes",
    x: 47,
    y: 66,
    severity: "elevated",
    threats: 2,
    traffic: "1.9 Gbps",
    coverage: "89%",
  },
  {
    id: "portal",
    label: "Citizen Portal",
    x: 24,
    y: 62,
    severity: "stable",
    threats: 0,
    traffic: "820 Mbps",
    coverage: "97%",
  },
];

const threatLinks = [
  ["gateway", "identity"],
  ["identity", "reports"],
  ["reports", "storage"],
  ["gateway", "portal"],
  ["portal", "edge"],
  ["edge", "storage"],
  ["identity", "edge"],
] as const;

export function OpenBreachDashboard() {
  const [activeNodeId, setActiveNodeId] = useState(threatNodes[0].id);
  const activeNode =
    threatNodes.find((node) => node.id === activeNodeId) ?? threatNodes[0];

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
          <ThreatMapPanel
            activeNode={activeNode}
            activeNodeId={activeNodeId}
            onNodeSelect={setActiveNodeId}
          />

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

function ThreatMapPanel({
  activeNode,
  activeNodeId,
  onNodeSelect,
}: {
  activeNode: ThreatNode;
  activeNodeId: string;
  onNodeSelect: (nodeId: string) => void;
}) {
  return (
    <section className="relative overflow-hidden border border-primary/30 bg-[#131313] p-2">
      <div className="absolute right-0 top-0 z-10 border-b border-l border-primary/30 bg-[#131313]/80 p-2 font-mono text-[10px] text-primary/50 uppercase backdrop-blur-sm">
        Threat_Map.live
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative aspect-video overflow-hidden border border-primary/20 pixel-corner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,219,233,0.12),_transparent_54%),linear-gradient(180deg,_rgba(0,0,0,0.2),_rgba(0,0,0,0.7))]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,219,233,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,219,233,0.06)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
          >
            {threatLinks.map(([fromId, toId]) => {
              const from = threatNodes.find((node) => node.id === fromId)!;
              const to = threatNodes.find((node) => node.id === toId)!;

              return (
                <line
                  key={`${fromId}-${toId}`}
                  stroke="rgba(0,219,233,0.36)"
                  strokeDasharray="2 2"
                  strokeWidth="0.6"
                  x1={from.x}
                  x2={to.x}
                  y1={from.y}
                  y2={to.y}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 scanlines opacity-30" />

          {threatNodes.map((node) => {
            const isActive = node.id === activeNodeId;
            const toneClassName =
              node.severity === "critical"
                ? "border-[#ffb4ab] bg-[#ffb4ab]/12 text-[#ffb4ab]"
                : node.severity === "elevated"
                  ? "border-[#ffd166] bg-[#ffd166]/12 text-[#ffd166]"
                  : "border-[#00e639] bg-[#00e639]/12 text-[#00e639]";

            return (
              <button
                key={node.id}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-terminal border px-3 py-2 text-left transition-all ${toneClassName} ${isActive ? "shadow-[0_0_22px_rgba(0,219,233,0.22)]" : "opacity-85 hover:opacity-100"}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                type="button"
                onClick={() => onNodeSelect(node.id)}
                onFocus={() => onNodeSelect(node.id)}
                onMouseEnter={() => onNodeSelect(node.id)}
              >
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase">
                  <span className="led-square led-glow bg-current" />
                  {node.label}
                </span>
                <span className="font-display text-sm text-white lg:text-base">
                  {node.threats} alerts
                </span>
              </button>
            );
          })}

          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase text-primary/60">
            <span className="border border-primary/20 bg-black/40 px-2 py-1">
              Hover or click a zone
            </span>
            <span className="border border-primary/20 bg-black/40 px-2 py-1">
              Approved scope only
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="border border-primary/15 bg-[#1c1b1b] p-4">
            <p className="font-mono text-[10px] tracking-[0.24em] text-primary/50 uppercase">
              Selected Zone
            </p>
            <h3 className="font-display mt-2 text-lg text-primary uppercase">
              {activeNode.label}
            </h3>
            <p className="mt-2 font-mono text-[10px] text-[#b9cacb]">
              Threat posture updates live as validations move across the approved
              topology.
            </p>
          </div>

          <div className="border border-primary/15 bg-[#1c1b1b] p-4">
            <div className="grid grid-cols-2 gap-3">
              <StatChip label="Threats" value={String(activeNode.threats)} />
              <StatChip label="Coverage" value={activeNode.coverage} />
              <StatChip label="Traffic" value={activeNode.traffic} />
              <StatChip
                label="Severity"
                value={activeNode.severity.toUpperCase()}
              />
            </div>
          </div>

          <div className="border border-primary/15 bg-[#1c1b1b] p-4">
            <p className="font-mono text-[10px] tracking-[0.24em] text-primary/50 uppercase">
              Quick Actions
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <ActionButton label="Open evidence trail" tone="primary" />
              <ActionButton label="Queue re-validation" tone="secondary" />
              <ActionButton label="Export zone summary" tone="muted" />
            </div>
          </div>
        </div>
      </div>
    </section>
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
      <button className="mt-2 text-[10px] text-[#00dbe9] uppercase hover:underline">
        Investigate &gt;&gt;
      </button>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-primary/10 bg-[#131313]/60 p-3">
      <p className="font-mono text-[10px] text-primary/50 uppercase">{label}</p>
      <p className="mt-1 font-display text-sm text-white">{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "secondary" | "muted";
}) {
  const className =
    tone === "primary"
      ? "border-primary text-primary hover:bg-primary/10"
      : tone === "secondary"
        ? "border-[#00e639]/30 text-[#00e639] hover:bg-[#00e639]/10"
        : "border-outline text-on-surface-variant hover:bg-white/5";

  return (
    <button
      className={`border px-3 py-2 text-left font-mono text-[10px] uppercase transition-colors pixel-corner ${className}`}
    >
      {label}
    </button>
  );
}
