export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export type ThreatSource = "passive" | "active" | "manual";

export type ThreatSeverityFilter = ThreatSeverity | "all";

export type ThreatEntry = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  municipality?: string;
  region?: string;
  severity: ThreatSeverity;
  score: number;
  alerts: number;
  source: ThreatSource;
  createdAt: string;
};