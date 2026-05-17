import type { Doc, DataModel } from "./_generated/dataModel";

// ============================================================================
// Geography
// ============================================================================

export type GeographyDto = {
  country: string;
  region: string;
  city: string;
};

// ============================================================================
// Targets
// ============================================================================

export type TargetProfileDto = {
  targetId: string;
  name: string;
  primaryUrl: string;
  riskTier: "low" | "medium" | "high" | "critical";
  classification: "public-sector" | "private" | "infrastructure" | "other";
  parentOrganization?: string;
  geography?: GeographyDto;
  population?: number;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
};

export type TargetListItemDto = {
  targetId: string;
  name: string;
  primaryUrl: string;
  riskTier: "low" | "medium" | "high" | "critical";
  classification: "public-sector" | "private" | "infrastructure" | "other";
  metadata?: Record<string, unknown>;
  latestRun?: {
    runId: string;
    status:
      | "pending"
      | "running"
      | "paused"
      | "completed"
      | "halted"
      | "rejected"
      | "failed";
    currentPhase?: string;
    durationMs?: number;
  } | null;
};

// ============================================================================
// Authorization Scopes
// ============================================================================

export type AuthorizationScopeDto = {
  authorizationId: string;
  targetId: string;
  scopeType: "full" | "passive-only" | "limited" | "time-bound";
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  constraints?: string[];
  evidenceUrl?: string;
  isExpired: boolean;
};

// ============================================================================
// Workflow Runs
// ============================================================================

export type WorkflowPhaseDto = {
  phase: string;
  enteredAt: string;
  exitedAt?: string;
  rejectionReason?: string;
};

export type WorkflowRunDto = {
  runId: string;
  targetId: string;
  status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "halted"
    | "rejected"
    | "failed";
  startedAt: string;
  completedAt?: string;
  abortedAt?: string;
  abortedReason?: string;
  currentPhase?: string;
  phases?: WorkflowPhaseDto[];
  durationMs?: number;
};

// ============================================================================
// Passive Scan Evidence
// ============================================================================

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

// ============================================================================
// Technology Fingerprints
// ============================================================================

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

// ============================================================================
// Vulnerability Hypotheses
// ============================================================================

export type VulnerabilityHypothesisDto = {
  hypothesisId: string;
  targetId: string;
  title: string;
  status:
    | "hypothesis"
    | "approved"
    | "confirmed"
    | "disproven"
    | "skipped"
    | "rejected";
  createdAt: string;
  proposedBy: string;
  description?: string;
  cweId?: string;
  cvssScore?: number;
  affectedComponents?: string[];
  prerequisites?: string[];
  testPlanId?: string;
  runId?: string;
  metadata?: Record<string, unknown>;
  linkedTestPlan?: TestPlanDto; // deferred: populated by domain function
};

// ============================================================================
// Test Plans
// ============================================================================

export type TestStepDto = {
  stepId: string;
  description: string;
  expectedOutcome?: string;
};

export type TestPlanDto = {
  planId: string;
  targetId: string;
  title: string;
  status:
    | "draft"
    | "pending-approval"
    | "approved"
    | "rejected"
    | "executing"
    | "completed"
    | "cancelled";
  createdAt: string;
  steps: TestStepDto[];
  hypothesisIds?: string[];
  approver?: string;
  approvedAt?: string;
  estimatedDurationMinutes?: number;
  runId?: string;
  metadata?: Record<string, unknown>;
  stepCount: number;
};

// ============================================================================
// Approval Gates
// ============================================================================

export type ApprovalGateDto = {
  gateId: string;
  targetId: string;
  gateType: "intake" | "test-plan" | "execution" | "report-release";
  status: "pending" | "approved" | "rejected" | "bypassed";
  requestedAt: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  bypassJustification?: string;
  linkedArtifactId?: string;
  runId?: string;
};

// ============================================================================
// Validation Results
// ============================================================================

export type ValidationResultDto = {
  resultId: string;
  targetId: string;
  status: "passed" | "failed" | "inconclusive" | "blocked" | "error";
  executedAt: string;
  executedBy: string;
  testPlanId?: string;
  hypothesisId?: string;
  summary?: string;
  evidenceRefs?: string[];
  runId?: string;
  metadata?: Record<string, unknown>;
  findingCount: number;
};

// ============================================================================
// Findings
// ============================================================================

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

// ============================================================================
// Audit Events
// ============================================================================

export type AuditEventDto = {
  eventId: string;
  targetId: string;
  eventType: string;
  actor: string;
  timestamp: string;
  runId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

// ============================================================================
// Report Artifacts
// ============================================================================

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

// ============================================================================
// State Machine Types
// ============================================================================

export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "halted"
  | "rejected"
  | "failed";

export type ApprovalGateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "bypassed";

export type VulnerabilityHypothesisStatus =
  | "hypothesis"
  | "approved"
  | "confirmed"
  | "disproven"
  | "skipped"
  | "rejected";

export type TestPlanStatus =
  | "draft"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "cancelled";

export type ValidTransitionMap = Record<string, readonly string[]>;

// ============================================================================
// Doc-to-DTO Mapper Types
// ============================================================================

export type DocToDto<TTableName extends keyof DataModel, TDto> = (
  doc: Doc<TTableName>,
) => TDto;
