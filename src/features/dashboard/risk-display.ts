import type { RiskLevel } from "../../shared/contracts.ts";

export type RiskDisplay = {
  level: RiskLevel;
  label: string;
  description: string;
  swatchClassName: string;
  markerClassName: string;
  textClassName: string;
};

export const riskLegend: RiskDisplay[] = [
  {
    level: "critical",
    label: "Critical risk",
    description:
      "Immediate public-service exposure or high-impact remediation priority.",
    swatchClassName: "bg-rose-400 shadow-rose-400/30",
    markerClassName: "border-rose-100 bg-rose-400 shadow-rose-400/50",
    textClassName: "text-rose-200",
  },
  {
    level: "high",
    label: "High risk",
    description: "Elevated exposure that should be queued before routine work.",
    swatchClassName: "bg-orange-300 shadow-orange-300/30",
    markerClassName: "border-orange-100 bg-orange-300 shadow-orange-300/50",
    textClassName: "text-orange-200",
  },
  {
    level: "medium",
    label: "Medium risk",
    description:
      "Monitor closely and schedule remediation with service owners.",
    swatchClassName: "bg-amber-200 shadow-amber-200/30",
    markerClassName: "border-amber-50 bg-amber-200 shadow-amber-200/50",
    textClassName: "text-amber-100",
  },
  {
    level: "low",
    label: "Low risk",
    description: "Lower apparent exposure; keep in the dashboard for coverage.",
    swatchClassName: "bg-emerald-300 shadow-emerald-300/30",
    markerClassName: "border-emerald-50 bg-emerald-300 shadow-emerald-300/50",
    textClassName: "text-emerald-200",
  },
];

export function getRiskDisplay(level: RiskLevel) {
  return (
    riskLegend.find((item) => item.level === level) ??
    riskLegend[riskLegend.length - 1]
  );
}
