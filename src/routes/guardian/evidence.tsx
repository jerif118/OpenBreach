import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guardian/evidence")({
  component: EvidenceRepository,
});

function EvidenceRepository() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.6)]"></div>
          <h1 className="font-display text-xl lg:text-2xl text-primary">EVIDENCE_REPOSITORY_V2.0</h1>
        </div>
        <p className="font-mono text-xs text-[#b9cacb]">DIRECTORY: /ROOT/ARCHIVE/THREAT_INTEL/</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-[#1c1b1b] border border-primary/15 p-6 flex flex-col justify-between">
          <div>
            <div className="font-mono text-[10px] text-[#b9cacb] uppercase tracking-widest mb-4">
              STORAGE_CAPACITY
            </div>
            <div className="h-4 bg-[#0e0e0e] border border-primary/10 p-[2px] mb-2">
              <div className="h-full bg-[#00dbe9] w-[68%]"></div>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-primary/60">USED: 412.5GB</span>
              <span className="text-primary">FREE: 187.5GB</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-primary/10">
            <div className="font-mono text-[10px] text-[#b9cacb] uppercase tracking-widest mb-2">
              DATA_STREAM_HEALTH
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.6)]"></div>
                <div className="w-3 h-3 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.6)]"></div>
                <div className="w-3 h-3 bg-[#00e639] shadow-[0_0_8px_rgba(0,230,57,0.6)]"></div>
                <div className="w-3 h-3 bg-[#00e639]/30"></div>
              </div>
              <span className="font-mono text-[10px] text-[#00e639]">STABLE (92%)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-[#1c1b1b] border border-primary/15 overflow-hidden">
          <div className="bg-[#2a2a2a] px-4 py-2 flex justify-between items-center border-b border-primary/10">
            <span className="font-mono text-[10px] text-primary uppercase">FILE_MANIFEST</span>
            <div className="flex gap-4 font-mono text-[10px] text-primary/40">
              <span>NAME</span>
              <span>TYPE</span>
              <span>SIZE</span>
            </div>
          </div>
          <div className="divide-y divide-primary/5">
            <FileEntry name="LOG_INCIDENT_001.TXT" type="LOG" size="124.5 KB" icon="description" />
            <FileEntry name="MALWARE_DUMP_04.JSON" type="JSON" size="2.8 MB" icon="code" />
            <FileEntry name="ENCRYPTION_KEY_0x9.CERT" type="CERT" size="4.0 KB" icon="verified_user" />
            <FileEntry name="SYSTEM_DEBUG_99.LOG" type="LOG" size="892.1 KB" icon="description" />
            <FileEntry name="PAYLOAD_STRUCT.JSON" type="JSON" size="14.2 MB" icon="deployed_code" />
          </div>
        </div>

        <div className="lg:col-span-12 bg-[#1c1b1b] border border-primary/15">
          <div className="flex border-b border-primary/10">
            <div className="px-6 py-3 border-r border-primary/10 bg-primary/5 text-primary font-mono text-[10px] uppercase">
              METADATA_VIEWER
            </div>
            <div className="px-6 py-3 text-[#b9cacb]/40 font-mono text-[10px]">
              HEX_DUMP
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="font-mono text-[10px] leading-relaxed text-[#b9cacb]">
              <p className="mb-2"><span className="text-primary/60">SOURCE:</span> 192.168.1.104</p>
              <p className="mb-2"><span className="text-primary/60">TIMESTAMP:</span> 2024-05-24 T22:41:09Z</p>
              <p className="mb-2"><span className="text-primary/60">SHA-256:</span> d57e1083e98b7a912184d08f707f45c4...</p>
              <p className="mb-2">
                <span className="text-primary/60">THREAT_LEVEL:</span>
                <span className="text-[#ffb4ab] font-bold"> CRITICAL</span>
              </p>
            </div>
            <div className="relative min-h-[160px] overflow-hidden border border-primary/15 bg-black/40">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,219,233,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(0,219,233,0.12)_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="absolute inset-0 scanlines opacity-25" />
              <div className="absolute inset-x-4 top-6 grid grid-cols-10 gap-2">
                {[74, 36, 54, 82, 48, 66, 28, 58, 42, 70].map(
                  (width, index) => (
                    <div key={index} className="h-2 bg-primary/20">
                      <div
                        className="h-full bg-[#00dbe9]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  ),
                )}
              </div>
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <div className="bg-primary/20 backdrop-blur-sm p-2 font-mono text-[10px] text-primary uppercase border-l-2 border-primary">
                  Visualizing Packet Sequence...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileEntry({
  name,
  type,
  size,
  icon,
}: {
  name: string;
  type: string;
  size: string;
  icon: string;
}) {
  return (
    <div className="flex items-center p-4 hover:bg-primary/5 transition-colors group cursor-pointer">
      <div className="w-8 h-8 flex items-center justify-center mr-4">
        <span className="material-symbols-outlined text-[#00dbe9]">{icon}</span>
      </div>
      <div className="flex-1 font-mono text-xs text-[#00dbe9] font-bold tracking-tight">{name}</div>
      <div className="font-mono text-[10px] text-[#b9cacb] mr-8">{type}</div>
      <div className="font-mono text-[10px] text-[#00e639]">{size}</div>
    </div>
  );
}
