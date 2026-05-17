import type { ThreatSeverityFilter } from "./threatMapTypes";

const severityFilterOptions: Array<{
  label: string;
  value: ThreatSeverityFilter;
}> = [
  { label: "All Signals", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

export function ThreatMapControls({
  severityFilter,
  onSeverityFilterChange,
}: {
  severityFilter: ThreatSeverityFilter;
  onSeverityFilterChange: (severity: ThreatSeverityFilter) => void;
}) {
  return (
    <div className="border-primary/15 inline-flex max-w-[340px] flex-col gap-2 border bg-[#101516]/88 p-2.5 backdrop-blur-sm">
      <div>
        <p className="text-primary/50 font-mono text-[10px] tracking-[0.24em] uppercase">
          Severity Filter
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {severityFilterOptions.map((option) => {
            const isActive = option.value === severityFilter;

            return (
              <button
                key={option.value}
                className={`pixel-corner border px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${getFilterButtonClassName(option.value, isActive)}`}
                type="button"
                onClick={() => onSeverityFilterChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getFilterButtonClassName(
  severity: ThreatSeverityFilter,
  isActive: boolean,
) {
  const activeClassName = isActive
    ? "text-white shadow-[0_0_18px_rgba(0,219,233,0.16)]"
    : "";

  if (severity === "low") {
    return `${activeClassName} border-[#00dbe9]/40 text-[#7df4ff] hover:bg-[#00dbe9]/10`;
  }

  if (severity === "medium") {
    return `${activeClassName} border-[#00e639]/35 text-[#72ff70] hover:bg-[#00e639]/10`;
  }

  if (severity === "high") {
    return `${activeClassName} border-[#ffd166]/35 text-[#ffd166] hover:bg-[#ffd166]/10`;
  }

  if (severity === "critical") {
    return `${activeClassName} border-[#ff7a9d]/35 text-[#ff8fb2] hover:bg-[#ff7a9d]/10`;
  }

  return `${activeClassName} border-outline text-[#b9cacb] hover:bg-white/5`;
}
