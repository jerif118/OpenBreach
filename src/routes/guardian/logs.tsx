import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/logs")({
  component: LogsPage,
});

function LogsPage() {
  const logs = [
    { time: "10:42:01", level: "INFO", message: "System startup complete" },
    { time: "10:42:05", level: "INFO", message: "Network interface eth0 UP" },
    { time: "10:43:22", level: "WARN", message: "High memory usage detected: 89%" },
    { time: "10:44:01", level: "INFO", message: "Security scan initiated" },
    { time: "10:45:33", level: "ERROR", message: "Failed login attempt from 192.168.1.45" },
    { time: "10:46:12", level: "INFO", message: "Firewall rule updated" },
  ];

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl text-primary uppercase tracking-wider">
          System Logs
        </h1>
        <p className="font-mono text-[10px] text-on-surface-variant mt-2">
          Real-time system event monitoring
        </p>
      </header>

      <div className="terminal-border bg-black border-primary/20 p-4 font-mono text-[10px] h-96 overflow-auto">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`flex gap-4 py-1 border-b border-primary/5 ${
              log.level === "ERROR" ? "text-error" :
              log.level === "WARN" ? "text-secondary-fixed-dim" :
              "text-on-surface-variant"
            }`}
          >
            <span className="text-primary/50">[{log.time}]</span>
            <span className={`font-bold ${
              log.level === "ERROR" ? "text-error" :
              log.level === "WARN" ? "text-secondary-fixed-dim" :
              "text-secondary-fixed-dim"
            }`}>[{log.level}]</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}