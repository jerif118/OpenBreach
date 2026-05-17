import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/validations")({
  component: SecurityValidations,
});

function SecurityValidations() {
  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-primary/20 pb-4">
        <div>
          <h1 className="font-display text-xl lg:text-2xl text-primary uppercase tracking-tighter">
            SECURITY_VALIDATIONS
          </h1>
          <p className="font-mono text-[10px] text-[#b9cacb]">
            NODE: 0x882A // PROTOCOL_LEVEL: 04 // LAST_SYNC: 0.002ms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.5)]"></div>
          <span className="font-mono text-[10px] text-[#00e639]">SYSTEM_ONLINE_STABLE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <span className="font-mono text-[10px] text-primary/60 uppercase">Active Protocols</span>
            <span className="font-mono text-[10px] text-primary/60">3 TOTAL</span>
          </div>

          <ProtocolCard
            title="TLS_ENCRYPTION"
            id="SEC-TLS-0092-V3"
            status="OK"
            statusType="success"
            icon="encrypted"
          />

          <ProtocolCard
            title="SQL_INJECTION_DEF"
            id="DEF-SQL-9912-XA"
            status="FAIL"
            statusType="error"
            icon="warning"
            warning="WARNING: SUSPICIOUS PATTERN DETECTED IN NODE_09"
          />

          <ProtocolCard
            title="AUTH_TOKEN_VAL"
            id="SEC-TOK-1102-K2"
            status="IDLE"
            statusType="idle"
            icon="key"
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <span className="font-mono text-[10px] text-primary/60 uppercase">Vulnerability Matrix</span>
            <span className="material-symbols-outlined text-primary/60 text-sm">grid_on</span>
          </div>

          <div className="border border-primary/10 bg-[#201f1f] p-6 flex-1 min-h-[400px] flex flex-col gap-6 relative">
            <div className="flex-1 relative flex items-center justify-center border border-primary/5 bg-black/40">
              <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-1 p-4 opacity-40">
                {generateGridBlocks()}
              </div>
              <div className="relative z-10 bg-black/80 px-4 py-2 border border-primary/40 pixel-corner">
                <p className="font-mono text-[10px] text-primary text-center">ANALYTIC_RENDER_v.01</p>
                <p className="text-[10px] text-primary/60 text-center">SCAN_PROGRESS: 88%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border-l-2 border-[#00e639] bg-[#00e639]/5">
                <p className="font-mono text-[10px] text-[#00e639] uppercase">Threat Index</p>
                <p className="font-display text-xl text-[#e5e2e1]">0.02</p>
              </div>
              <div className="p-3 border-l-2 border-[#ffb4ab] bg-[#ffb4ab]/5">
                <p className="font-mono text-[10px] text-[#ffb4ab] uppercase">Vulnerabilities</p>
                <p className="font-display text-xl text-[#e5e2e1]">1</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-primary/40 uppercase">
                <span>Entropy Rate</span>
                <span>4.2kbps</span>
              </div>
              <div className="w-full bg-primary/5 h-1">
                <div className="bg-[#00dbe9] h-full w-[42%]"></div>
              </div>
            </div>
          </div>

          <div className="relative h-32 overflow-hidden border border-primary/10 bg-[#201f1f]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,219,233,0.22),_transparent_56%)]" />
            <div className="absolute inset-0 scanlines opacity-20" />
            <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
              {["TLS", "AUTH", "SCOPE", "RATE", "PDF"].map((label, index) => (
                <div
                  key={label}
                  className={`flex h-14 w-14 items-center justify-center border text-[10px] font-mono uppercase ${index === 2 ? "border-[#ffb4ab] text-[#ffb4ab]" : "border-primary/40 text-primary"}`}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 border-t border-primary/10 pt-4 flex justify-between items-center opacity-40">
        <div className="flex gap-8">
          <p className="font-mono text-[10px] uppercase">UUID: FFFF-0012-A9E0</p>
          <p className="font-mono text-[10px] uppercase">KERN: 6.4.2-SENTINEL</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase">© 2024 OPENBREACH_SYS</p>
        </div>
      </footer>
    </div>
  );
}

function ProtocolCard({
  title,
  id,
  status,
  statusType,
  icon,
  warning,
}: {
  title: string;
  id: string;
  status: string;
  statusType: "success" | "error" | "idle";
  icon: string;
  warning?: string;
}) {
  const statusStyles: Record<string, string> = {
    success: "bg-[#13ff43]/10 border-[#00e639]/30",
    error: "bg-[#93000a]/20 border-[#ffb4ab]/50",
    idle: "bg-[#00f0ff]/10 border-primary/30",
  };

  const dotStyles: Record<string, string> = {
    success: "bg-[#00e639]",
    error: "bg-[#ffb4ab]",
    idle: "bg-[#00dbe9]",
  };

  const textStyles: Record<string, string> = {
    success: "text-[#00e639]",
    error: "text-[#ffb4ab]",
    idle: "text-[#00dbe9]",
  };

  const cardBorderStyle = statusType === "error" ? "border-[#ffb4ab]/30" : "border-primary/15";
  const cardGlowStyle = statusType === "error" ? "pixel-glow-error" : statusType === "success" ? "pixel-glow-secondary" : "pixel-glow";

  return (
    <div className={`border ${cardBorderStyle} bg-[#0e0e0e] p-4 ${cardGlowStyle} relative`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`text-2xl material-symbols-outlined ${statusType === "error" ? "text-[#ffb4ab]" : "text-[#00e639]"}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-display text-base text-primary uppercase">
              {title}
            </h3>
            <p className="font-mono text-[10px] text-[#b9cacb]">{id}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 ${statusStyles[statusType]}`}>
            <span className={`w-2 h-2 ${dotStyles[statusType]}`}></span>
            <span className={`font-mono text-[10px] font-bold ${textStyles[statusType]}`}>
              STATUS: {status}
            </span>
          </div>
          <button className={`font-mono text-[10px] border px-4 py-1 transition-all uppercase ${
            statusType === "error"
              ? "border-[#ffb4ab]/40 text-[#ffb4ab] hover:bg-[#ffb4ab]/20"
              : "border-primary/40 text-primary hover:bg-primary/20"
          }`}>
            {statusType === "error" ? "REPAIR" : "RUN SCAN"}
          </button>
        </div>
      </div>
      {warning && (
        <div className="mt-4 font-mono text-[10px] text-[#ffb4ab]/80 px-2">
          &gt; {warning}
        </div>
      )}
    </div>
  );
}

function generateGridBlocks() {
  const blocks = [];
  const pattern = [
    [0.2, 0.05, 0.05, 0.3, 0.05, 0.05, 0.2, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
  ];

  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      const value = pattern[i][j];
      if (value > 0.3) {
        blocks.push(
          <div key={`${i}-${j}`} className="bg-[#00e639]/50 border border-[#00e639]"></div>
        );
      } else if (value > 0.2) {
        blocks.push(
          <div key={`${i}-${j}`} className="bg-[#ffb4ab]/40 border border-[#ffb4ab]"></div>
        );
      } else if (value > 0.1) {
        blocks.push(
          <div key={`${i}-${j}`} className="bg-[#00e639]/20 border border-[#00e639]/40"></div>
        );
      } else {
        blocks.push(
          <div key={`${i}-${j}`} className="bg-primary/5 border border-primary/10"></div>
        );
      }
    }
  }
  return blocks;
}
