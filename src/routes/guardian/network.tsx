import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/network")({
  component: NetworkPage,
});

function NetworkPage() {
  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl text-primary uppercase tracking-wider">
          Network Monitor
        </h1>
        <p className="font-mono text-[10px] text-on-surface-variant mt-2">
          Real-time network topology and traffic analysis
        </p>
      </header>

      <div className="terminal-border bg-surface-container-high border-primary/15 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-secondary-fixed-dim led-glow"></div>
          <span className="font-mono text-[10px] text-secondary-fixed-dim uppercase">
            Active Connections: 128
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="terminal-border bg-surface-container-low border-primary/10 p-4">
            <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">Inbound Traffic</p>
            <p className="font-display text-xl text-primary-fixed-dim">8.4 Gbps</p>
          </div>
          <div className="terminal-border bg-surface-container-low border-primary/10 p-4">
            <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">Outbound Traffic</p>
            <p className="font-display text-xl text-secondary-fixed-dim">2.1 Gbps</p>
          </div>
          <div className="terminal-border bg-surface-container-low border-primary/10 p-4">
            <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">Active Nodes</p>
            <p className="font-display text-xl text-primary">1,024</p>
          </div>
        </div>
      </div>
    </div>
  );
}