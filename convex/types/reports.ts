export type ReportSectionDto = {
  title: string;
  narrative: string;
  bullets: string[];
};

export type ReportPdfDto = {
  storagePath: string;
  fileName: string;
  contentType: "application/pdf";
  generatedAt?: string;
  sizeBytes?: number;
};

export type ReportArtifactDto = {
  artifactId: string;
  targetId: string;
  variant: "technical" | "friendly" | "executive";
  title: string;
  generatedAt: string;
  status: "pending" | "generating" | "completed" | "failed";
  findings: string[];
  sections?: ReportSectionDto[];
  pdf?: ReportPdfDto;
  generatedBy?: "deterministic-fallback" | "ai-provider" | "template-engine";
  runId?: string;
  metadata?: Record<string, unknown>;
};
