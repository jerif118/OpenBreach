export type PassiveScanEvidenceDto = {
  evidenceId: string;
  targetId: string;
  source: string;
  collectedAt: string;
  requestedUrl: string;
  reachable: boolean;
  finalUrl?: string;
  httpStatus?: number;
  headers?: Record<string, string>;
  tls?: {
    valid: boolean;
    expiresAt?: string;
    issuer?: string;
  };
  cms?: {
    name: string;
    version?: string;
    confidence: number;
    evidence: string[];
  };
  adminExposure?: {
    path: string;
    method?: "HEAD" | "GET";
    reachable: boolean;
    httpStatus?: number;
    finalUrl?: string;
  }[];
  errors?: {
    stage: "http" | "tls" | "cms" | "admin-exposure";
    message: string;
  }[];
  runId?: string;
  envelopeSource: string;
  envelopeRecordedAt: string;
  envelopeHash: string;
  envelopeCollectedBy: string;
};
