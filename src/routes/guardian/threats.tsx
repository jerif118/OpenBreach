import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/threats")({
  component: ThreatsPage,
});

function ThreatsPage() {
  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl text-error uppercase tracking-wider">
          Threat Intelligence
        </h1>
        <p className="font-mono text-[10px] text-on-surface-variant mt-2">
          Active threat detection and analysis
        </p>
      </header>

      <div className="terminal-border bg-error/5 border-error/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-error">warning</span>
          <span className="font-mono text-[10px] text-error uppercase font-bold">
            3 Critical Threats Detected
          </span>
        </div>

        <div className="space-y-4">
          <ThreatItem
            title="SQL Injection Attempt"
            source="192.168.1.45"
            target="db_cluster_alpha"
            severity="critical"
          />
          <ThreatItem
            title="Brute Force Attack"
            source="10.0.0.99"
            target="auth_service"
            severity="high"
          />
          <ThreatItem
            title="DDoS Pattern Detected"
            source="External"
            target="edge_router_01"
            severity="medium"
          />
        </div>
      </div>
    </div>
  );
}

function ThreatItem({
  title,
  source,
  target,
  severity,
}: {
  title: string;
  source: string;
  target: string;
  severity: "critical" | "high" | "medium";
}) {
  const severityColors = {
    critical: "text-error border-error/50 bg-error/10",
    high: "text-tertiary-container border-tertiary-container/50 bg-tertiary-container/10",
    medium: "text-secondary-fixed-dim border-secondary-fixed-dim/50 bg-secondary-fixed-dim/10",
  };

  return (
    <div className="terminal-border bg-surface-container-low border-primary/15 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-xs text-primary font-bold">{title}</h3>
        <span className={`font-mono text-[10px] px-2 py-1 uppercase border ${severityColors[severity]}`}>
          {severity}
        </span>
      </div>
      <p className="font-mono text-[10px] text-on-surface-variant">
        Source: {source} | Target: {target}
      </p>
    </div>
  );
}