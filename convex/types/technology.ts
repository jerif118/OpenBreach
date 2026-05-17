export type TechnologyFingerprintDto = {
  fingerprintId: string;
  targetId: string;
  technology: string;
  category:
    | "server"
    | "framework"
    | "cms"
    | "database"
    | "library"
    | "cdn"
    | "analytics"
    | "other";
  confidence: number;
  detectedAt: string;
  version?: string;
  versionConfidence?: number;
  evidence?: string[];
  cpe?: string;
  runId?: string;
  envelopeSource: string;
  envelopeRecordedAt: string;
  envelopeHash: string;
  envelopeCollectedBy: string;
};
