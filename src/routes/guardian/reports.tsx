import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/reports")({
  component: SecurityReports,
});

function SecurityReports() {
  return (
    <div className="space-y-8">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-[#00e639] mb-2">
          <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            System / Security / Reports
          </span>
        </div>
        <h1 className="font-display text-2xl lg:text-3xl text-primary uppercase">
          Audit Dashboard
        </h1>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="border border-[#00dbe9] p-6 bg-[#201f1f] relative overflow-hidden">
          <div className="absolute inset-0 scanlines opacity-30 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[#00e639] font-mono text-[10px] uppercase font-bold tracking-widest">
                Live Trace: Kernel_Alpha
              </h2>
              <p className="text-[#b9cacb] font-mono text-[10px] mt-1">
                PID: 8829 | ADDR: 0x004F3
              </p>
            </div>
            <span className="text-[#00e639] font-mono text-xs">82%</span>
          </div>
          <div className="flex gap-1 h-4 w-full">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex-1 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.5)]"></div>
            ))}
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex-1 bg-[#353534]/30"></div>
            ))}
          </div>
        </div>

        <div className="border border-[#849495] p-6 bg-[#201f1f] relative overflow-hidden">
          <div className="absolute inset-0 scanlines opacity-50 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[#00dbe9] font-mono text-[10px] uppercase font-bold tracking-widest">
                Network_Integrity
              </h2>
              <p className="text-[#b9cacb] font-mono text-[10px] mt-1">
                SCANNING PORTS: 1-65535
              </p>
            </div>
            <span className="text-[#00dbe9] font-mono text-xs animate-pulse">RUNNING</span>
          </div>
          <div className="flex gap-1 h-4 w-full">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 bg-[#00dbe9]"></div>
            ))}
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 bg-[#353534]/30"></div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-2 border border-[#849495] p-8 bg-[#2a2a2a] border border-primary/10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 bg-[#00e639] shadow-[0_0_6px_#00e639]"></span>
                <h3 className="font-display text-lg text-primary uppercase">
                  Monthly Perimeter Audit
                </h3>
              </div>
              <p className="text-[#b9cacb] font-mono text-xs max-w-lg">
                Full penetration testing report across all edge nodes. Identified 42 non-critical vulnerabilities and 2 high-priority leaks in the legacy API gateway.
              </p>
            </div>
            <div className="text-right">
              <div className="text-primary font-mono text-[10px]">24_OCT_2024</div>
              <div className="text-[10px] text-[#b9cacb] font-mono">VERSION 4.2.0-STABLE</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-[#131313]/50 border border-primary/5">
              <div className="text-[10px] text-[#b9cacb] font-mono uppercase">Threats</div>
              <div className="font-display text-lg text-[#ffb4ab] font-bold">12</div>
            </div>
            <div className="p-4 bg-[#131313]/50 border border-primary/5">
              <div className="text-[10px] text-[#b9cacb] font-mono uppercase">Patches</div>
              <div className="font-display text-lg text-[#00e639] font-bold">08</div>
            </div>
            <div className="p-4 bg-[#131313]/50 border border-primary/5">
              <div className="text-[10px] text-[#b9cacb] font-mono uppercase">Uptime</div>
              <div className="font-display text-lg text-[#00dbe9] font-bold">99%</div>
            </div>
            <div className="p-4 bg-[#131313]/50 border border-primary/5">
              <div className="text-[10px] text-[#b9cacb] font-mono uppercase">Score</div>
              <div className="font-display text-lg text-primary font-bold">A+</div>
            </div>
          </div>

          <button className="w-full py-4 border-2 border-primary text-primary font-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-primary/10 transition-all flex items-center justify-center gap-4 pixel-corner">
            <span className="material-symbols-outlined">download</span>
            GENERATE PDF
          </button>
        </div>

        <div className="border border-[#849495] p-8 bg-[#201f1f] relative group">
          <div className="mb-6">
            <h3 className="text-[#b9cacb] font-mono text-[10px] uppercase tracking-widest mb-4">
              Traffic Vectors
            </h3>
            <div className="space-y-4">
              <VectorBar label="TCP Incoming" value={65} color="#00dbe9" />
              <VectorBar label="UDP Fragments" value={12} color="#ffb4ab" />
              <VectorBar label="SSH Auth" value={23} color="#00e639" />
            </div>
          </div>

          <TrafficSpectrum />

          <button className="w-full py-4 border border-[#849495] text-[#849495] font-mono text-[10px] font-bold uppercase hover:border-primary hover:text-primary transition-all pixel-corner">
            VIEW DETAILS
          </button>
        </div>
      </section>

      <section className="border border-[#849495] bg-[#0e0e0e] overflow-hidden">
        <div className="p-4 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
            Historical Audit Logs
          </span>
          <div className="flex gap-4">
            <span className="flex items-center gap-2 font-mono text-[10px] text-[#b9cacb]">
              <span className="w-2 h-2 bg-[#00e639]"></span>
              PASSED
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] text-[#b9cacb]">
              <span className="w-2 h-2 bg-[#ffb4ab]"></span>
              FAILED
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[10px]">
            <thead className="bg-[#201f1f] border-b border-primary/10">
              <tr>
                <th className="px-6 py-4 text-primary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-primary uppercase tracking-widest">Audit_ID</th>
                <th className="px-6 py-4 text-primary uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-primary uppercase tracking-widest">Checksum</th>
                <th className="px-6 py-4 text-primary uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              <AuditRow status="passed" id="SYS_AUD_882" timestamp="2024-10-12 04:22:01" checksum="FA-88-29-C1" />
              <AuditRow status="failed" id="SYS_AUD_881" timestamp="2024-10-10 18:05:44" checksum="D3-11-AA-4F" />
              <AuditRow status="passed" id="SYS_AUD_880" timestamp="2024-10-08 12:15:22" checksum="9E-FF-02-99" />
              <AuditRow status="passed" id="SYS_AUD_879" timestamp="2024-10-01 09:30:00" checksum="CB-21-44-ED" />
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#201f1f] flex justify-center border-t border-primary/10">
          <button className="text-[#b9cacb] font-mono text-[10px] uppercase tracking-widest hover:text-primary transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">unfold_more</span>
            Expand Technical History
          </button>
        </div>
      </section>
    </div>
  );
}

function VectorBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] mb-1 uppercase">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 bg-[#353534]/30 w-full">
        <div className="h-full" style={{ width: `${value}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
}

function TrafficSpectrum() {
  return (
    <div className="mb-6 h-32 overflow-hidden border border-primary/10 bg-[#131313] p-4">
      <div className="grid h-full grid-cols-12 items-end gap-2">
        {[28, 44, 35, 62, 50, 72, 58, 76, 46, 54, 38, 60].map(
          (height, index) => (
            <div key={index} className="relative flex h-full items-end">
              <div
                className="w-full bg-[linear-gradient(180deg,_rgba(0,230,57,0.95),_rgba(0,219,233,0.25))] shadow-[0_0_12px_rgba(0,219,233,0.18)]"
                style={{ height: `${height}%` }}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function AuditRow({
  status,
  id,
  timestamp,
  checksum,
}: {
  status: "passed" | "failed";
  id: string;
  timestamp: string;
  checksum: string;
}) {
  const statusColor = status === "passed" ? "#00e639" : "#ffb4ab";

  return (
    <tr className="hover:bg-primary/5 transition-colors group">
      <td className="px-6 py-4">
        <span
          className="w-2 h-2 inline-block"
          style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}` }}
        ></span>
      </td>
      <td className="px-6 py-4 text-[#e5e2e1]">{id}</td>
      <td className="px-6 py-4 text-[#b9cacb]">{timestamp}</td>
      <td className="px-6 py-4 text-[#b9cacb]">{checksum}</td>
      <td className="px-6 py-4 text-right">
        <button className="text-primary hover:underline uppercase text-[10px]">
          Retrieve
        </button>
      </td>
    </tr>
  );
}
