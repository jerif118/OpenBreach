import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/config")({
  component: PlatformConfiguration,
});

function PlatformConfiguration() {
  return (
    <div className="space-y-8">
      <div className="mb-8 flex items-center justify-between border-b border-primary/10 pb-4">
        <div>
          <h1 className="font-display text-xl lg:text-2xl text-[#00dbe9] uppercase tracking-tighter">
            PLATFORM_CONFIGURATION
          </h1>
          <p className="font-mono text-[10px] text-[#b9cacb] mt-1">
            MODULE: SECURITY_CORE_V4.2.0
          </p>
        </div>
        <div className="flex items-center gap-2 text-[#00e639] font-mono text-[10px]">
          <span className="blink">&gt;</span>
          SESSION_ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <section className="bg-[#0e0e0e] border border-primary/15 p-6 relative">
            <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest border-l-2 border-primary pl-3 mb-6">
              SYSTEM_FLAGS
            </h2>
            <div className="flex flex-col gap-8">
              <ToggleSwitch label="AUTO_DECRYPT" checked />
              <ToggleSwitch label="STEALTH_MODE" checked={false} />
              <ToggleSwitch label="FORCE_SSL_256" checked />
            </div>
          </section>

          <section className="bg-[#0e0e0e] border border-primary/15 p-6 flex flex-col gap-4">
            <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest border-l-2 border-primary pl-3">
              CORE_METRICS
            </h2>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="p-3 bg-[#1c1b1b] border border-primary/5">
                <div className="text-[10px] text-[#b9cacb] mb-1">CPU_LOAD</div>
                <div className="text-[#00e639] font-bold text-lg">42.8%</div>
              </div>
              <div className="p-3 bg-[#1c1b1b] border border-primary/5">
                <div className="text-[10px] text-[#b9cacb] mb-1">RAM_USAGE</div>
                <div className="text-[#00e639] font-bold text-lg">12.4GB</div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          <section className="bg-[#0e0e0e] border border-primary/15 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-primary/10 font-mono text-5xl select-none pointer-events-none">
              DATA_IN
            </div>
            <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest border-l-2 border-primary pl-3 mb-8">
              INTEGRATION_ENDPOINTS
            </h2>
            <div className="grid grid-cols-1 gap-8">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-[#b9cacb] flex items-center gap-2">
                  <span className="text-[#00e639] font-bold">&gt;</span>
                  WEBHOOK_URL
                </label>
                <div className="relative group">
                  <input
                    className="w-full bg-black border border-primary/30 p-4 font-mono text-xs text-primary focus:border-[#00dbe9] focus:ring-0 outline-none transition-all pixel-corner"
                    type="text"
                    value="https://api.sentinel.io/v1/hooks/9b1deb4d"
                    readOnly
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-3 text-[#b9cacb]">
                    <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors text-sm">content_copy</span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-[#ffb4ab] transition-colors text-sm">lock</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-[#b9cacb] flex items-center gap-2">
                  <span className="text-[#00e639] font-bold">&gt;</span>
                  ESCALATION_EMAIL
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-black border border-primary/30 p-4 font-mono text-xs text-primary focus:border-[#00dbe9] focus:ring-0 outline-none transition-all pixel-corner placeholder:text-primary/20"
                    placeholder="ADMIN@OPENBREACH.SEC"
                    type="email"
                  />
                  <div className="absolute left-4 -bottom-6 text-[10px] text-primary/40 font-mono">
                    SYSTEM_PROMPT: EMAIL_REQUIRED_FOR_CRITICAL_ALERTS
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0e0e0e] border border-primary/15 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest border-l-2 border-primary pl-3">
                GLOBAL_ALLOWLIST
              </h2>
              <button className="flex items-center gap-2 text-[#00e639] border border-[#00e639]/30 px-3 py-1 hover:bg-[#00e639]/10 transition-all font-mono text-[10px]">
                <span className="material-symbols-outlined text-sm">add</span>
                ADD_ENTRY
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <AllowlistChip label="192.168.1.100" />
              <AllowlistChip label="TRUSTED_DEV_NODE" />
              <AllowlistChip label="*.GUARD.NET" />
              <AllowlistChip label="SECURE_GATEWAY_B" />
              <AllowlistChip label="10.0.0.254" />
              <div className="px-3 py-1 bg-transparent border border-dashed border-[#849495] text-[#b9cacb] font-mono text-[10px] flex items-center gap-2 pixel-corner opacity-50 italic">
                + ADD_MORE
              </div>
            </div>

            <div className="mt-12 p-4 border border-[#3b494b]/30 flex items-start gap-4">
              <span className="material-symbols-outlined text-[#ffb2b8]">warning</span>
              <div>
                <div className="text-[#ffb2b8] font-bold font-mono text-[10px]">
                  SECURITY_ADVISORY
                </div>
                <p className="text-[#b9cacb] font-mono text-[10px] leading-relaxed mt-1">
                  Changes to the global allowlist may expose internal nodes to bypass firewall rules. All entries are logged and archived for 90 days in compliance with ISO-27001.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-12">
          <div className="bg-[#2a2a2a] p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.6)]"></span>
                <span className="text-[10px] font-mono text-[#00e639]">CONFIG_SYNCED</span>
              </div>
              <div className="h-4 w-px bg-[#3b494b]"></div>
              <div className="text-[10px] font-mono text-[#b9cacb] uppercase">
                LAST_SAVE: 2023-10-27 14:22:04 UTC
              </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button className="flex-grow md:flex-none px-8 py-3 border border-[#849495] text-[#849495] font-mono text-[10px] uppercase tracking-widest hover:bg-[#849495]/5 transition-all">
                DISCARD
              </button>
              <button className="flex-grow md:flex-none px-8 py-3 bg-[#00e639] text-[#002203] font-bold font-mono text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(0,230,57,0.4)] transition-all pixel-corner">
                COMMIT_CHANGES
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-[#b9cacb]">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          checked={checked}
          className="sr-only peer"
          readOnly
          type="checkbox"
        />
        <div className="w-14 h-7 bg-[#2a2a2a] border-2 border-[#3b494b] peer-checked:border-[#00e639] peer-checked:bg-[#00e639]/10 transition-all relative">
          <div className={`absolute left-1 top-1 w-5 h-3 bg-[#3b494b] transition-transform ${checked ? "translate-x-7 bg-[#00e639]" : ""}`}></div>
        </div>
      </label>
    </div>
  );
}

function AllowlistChip({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 bg-[#00e639]/5 border border-[#00e639] text-[#00e639] font-mono text-[10px] flex items-center gap-2 pixel-corner hover:bg-[#00e639]/20 cursor-default transition-all group">
      {label}
      <span className="material-symbols-outlined text-sm cursor-pointer hover:text-white transition-colors">close</span>
    </div>
  );
}
