export type FindingDto = {
  findingId: string;
  targetId: string;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status:
    | "observed"
    | "confirmed"
    | "likely"
    | "skipped"
    | "unresolved"
    | "false-positive";
  createdAt: string;
  category?:
    | "tls"
    | "headers"
    | "cms"
    | "exposure"
    | "admin-exposure"
    | "availability"
    | "known-vulnerability"
    | "configuration"
    | "logic";
  evidence?: string;
  remediationHint?: string;
  affectedAssets?: string[];
  confidence?: "low" | "medium" | "high";
  cweId?: string;
  cvssScore?: number;
  validationResultId?: string;
  reportReady?: boolean;
  runId?: string;
};
