import type {
  ApprovalGateDto,
  AuditEventDto,
  FindingDto,
  PassiveScanEvidenceDto,
  ReportArtifactDto,
  TargetListItemDto,
  TestPlanDto,
  ValidationResultDto,
  VulnerabilityHypothesisDto,
  WorkflowPhaseName,
  WorkflowRunDto,
  AuthorizationScopeDto,
} from "../../../convex/types.js";
import type { ValidationLevel } from "../../shared/target-scope-decision.ts";

import approvalGateFixture from "../../../data/targets/approval-gate.json";
import auditEventFixture from "../../../data/targets/audit-event.json";
import passiveEvidenceFixture from "../../../data/targets/passive-evidence-record.json";
import rejectedTargetFixture from "../../../data/targets/rejected-target.json";
import reportArtifactFixture from "../../../data/targets/report-artifact.json";
import reportReadyFindingFixture from "../../../data/targets/report-ready-finding.json";
import targetApprovedFixture from "../../../data/targets/target-approved-public.json";
import testPlanFixture from "../../../data/targets/test-plan.json";
import validationResultFixture from "../../../data/targets/validation-result.json";
import vulnerabilityHypothesisFixture from "../../../data/targets/vulnerability-hypothesis.json";

export const DEMO_TARGET_STORAGE_KEY = "openbreach:demo-targets";

export type PipelineTone = "green" | "red" | "cyan" | "amber";

export type ReportDownloadEntry = {
  id: string;
  fileName: string;
  href: string;
  label: string;
  targetName: string;
  variant: "technical" | "friendly";
};

export type PipelineTargetRecord = TargetListItemDto & {
  source: "fixture" | "session" | "convex";
  summary: string;
  approvalStatus: "approved" | "pending" | "rejected";
  validationLevel: ValidationLevel;
  rateLimit: number;
  allowedAssets: string[];
  deniedAssets: string[];
  latestRun: WorkflowRunDto | null;
  evidence: PassiveScanEvidenceDto | null;
  hypothesis: VulnerabilityHypothesisDto | null;
  testPlan: TestPlanDto | null;
  approvalGate: ApprovalGateDto | null;
  validation: ValidationResultDto | null;
  findings: FindingDto[];
  reportArtifact: ReportArtifactDto | null;
  reportDownloads: ReportDownloadEntry[];
  auditEvents: AuditEventDto[];
  coverage: number;
  alerts: number;
  nextActionLabel: string;
  nextActionTo: string;
};

export type StoredDemoTarget = {
  targetId: string;
  name: string;
  primaryUrl: string;
  classification: TargetListItemDto["classification"];
  riskTier: TargetListItemDto["riskTier"];
  geography?: TargetListItemDto["geography"];
  population?: number;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  runId: string;
  status: WorkflowRunDto["status"];
  currentPhase: WorkflowPhaseName;
  approverName?: string;
  validationLevel?: ValidationLevel;
  rateLimit?: number;
  allowedAssets?: string[];
  deniedAssets?: string[];
  scopeDecision?: Record<string, unknown>;
  authorizationScope?: AuthorizationScopeDto | null;
  workflowRun?: WorkflowRunDto;
  auditEvents?: AuditEventDto[];
};

const DEMO_REPORT_DOWNLOADS: ReportDownloadEntry[] = [
  {
    id: "report-demo-alvaro-technical",
    fileName: "mx-cdmx-alvaro-obregon-technical.pdf",
    href: "/reports/mx-cdmx-alvaro-obregon-technical.pdf",
    label: "ALVARO_OBREGON_TECHNICAL",
    targetName: "Alvaro Obregon",
    variant: "technical",
  },
  {
    id: "report-demo-alvaro-friendly",
    fileName: "mx-cdmx-alvaro-obregon-friendly.pdf",
    href: "/reports/mx-cdmx-alvaro-obregon-friendly.pdf",
    label: "ALVARO_OBREGON_FRIENDLY",
    targetName: "Alvaro Obregon",
    variant: "friendly",
  },
  {
    id: "report-demo-coyoacan-technical",
    fileName: "mx-cdmx-coyoacan-technical.pdf",
    href: "/reports/mx-cdmx-coyoacan-technical.pdf",
    label: "COYOACAN_TECHNICAL",
    targetName: "Coyoacan",
    variant: "technical",
  },
  {
    id: "report-demo-coyoacan-friendly",
    fileName: "mx-cdmx-coyoacan-friendly.pdf",
    href: "/reports/mx-cdmx-coyoacan-friendly.pdf",
    label: "COYOACAN_FRIENDLY",
    targetName: "Coyoacan",
    variant: "friendly",
  },
];

const APPROVED_WORKFLOW_RUN: WorkflowRunDto = {
  runId: "run-merida-001",
  targetId: "target-merida-001",
  status: "completed",
  startedAt: "2024-01-15T09:00:00Z",
  completedAt: "2024-01-15T11:00:00Z",
  currentPhase: "reporting",
  phases: [
    {
      phase: "intake",
      enteredAt: "2024-01-15T09:00:00Z",
      exitedAt: "2024-01-15T09:05:00Z",
    },
    {
      phase: "passive-scan",
      enteredAt: "2024-01-15T09:05:00Z",
      exitedAt: "2024-01-15T10:00:00Z",
    },
    {
      phase: "hypothesis",
      enteredAt: "2024-01-15T10:00:00Z",
      exitedAt: "2024-01-15T10:05:00Z",
    },
    {
      phase: "approval",
      enteredAt: "2024-01-15T10:05:00Z",
      exitedAt: "2024-01-15T10:15:00Z",
    },
    {
      phase: "validation",
      enteredAt: "2024-01-15T10:15:00Z",
      exitedAt: "2024-01-15T10:30:00Z",
    },
    {
      phase: "reporting",
      enteredAt: "2024-01-15T10:30:00Z",
      exitedAt: "2024-01-15T11:00:00Z",
    },
  ],
  durationMs: 7_200_000,
};

function getObjectValue(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function normalizeValidationLevel(value: unknown): ValidationLevel {
  if (
    value === "passive" ||
    value === "semiactive" ||
    value === "controlled_validation"
  ) {
    return value;
  }

  return "passive";
}

function getRiskWeight(riskTier: PipelineTargetRecord["riskTier"]): number {
  switch (riskTier) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

function getSeverityWeight(
  severity: FindingDto["severity"] | undefined,
): number {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "info":
    default:
      return 1;
  }
}

function getHighestFindingSeverity(
  findings: FindingDto[],
): FindingDto["severity"] | undefined {
  return [...findings]
    .sort(
      (left, right) =>
        getSeverityWeight(right.severity) - getSeverityWeight(left.severity),
    )
    .at(0)?.severity;
}

function deriveCoverage(record: {
  approvalStatus: PipelineTargetRecord["approvalStatus"];
  evidence: PassiveScanEvidenceDto | null;
  testPlan: TestPlanDto | null;
  validation: ValidationResultDto | null;
  reportArtifact: ReportArtifactDto | null;
}): number {
  if (record.approvalStatus === "rejected") {
    return 5;
  }
  if (record.reportArtifact?.status === "completed") {
    return 100;
  }
  if (record.validation) {
    return 82;
  }
  if (record.testPlan) {
    return 64;
  }
  if (record.evidence) {
    return 38;
  }
  return 12;
}

function buildReportDownloads(
  targetId: string,
  reportArtifact: ReportArtifactDto | null,
): ReportDownloadEntry[] {
  if (targetId !== "target-merida-001" || !reportArtifact) {
    return [];
  }

  return DEMO_REPORT_DOWNLOADS;
}

function buildApprovedFixtureRecord(): PipelineTargetRecord {
  const evidence: PassiveScanEvidenceDto = {
    ...(passiveEvidenceFixture as unknown as Omit<
      PassiveScanEvidenceDto,
      | "envelopeCollectedBy"
      | "envelopeHash"
      | "envelopeRecordedAt"
      | "envelopeSource"
    >),
    envelopeSource: "fixture",
    envelopeRecordedAt: "2024-01-15T10:00:00Z",
    envelopeHash: "fixture-envelope-merida-001",
    envelopeCollectedBy: "fixture-pipeline",
  };
  const validation: ValidationResultDto = {
    resultId: "result-merida-001",
    targetId: "target-merida-001",
    status: "failed",
    executedAt: "2024-01-15T10:30:00Z",
    executedBy: "agent-test-runner",
    summary: "Validation failed due to deprecated TLS configuration.",
    evidenceRefs: ["evidence-merida-ssl-001"],
    runId: "run-merida-001",
    findingCount: 1,
  };
  const reportArtifact: ReportArtifactDto = {
    ...(reportArtifactFixture as ReportArtifactDto),
    pdf: {
      storagePath: "data/reports/mx-cdmx-alvaro-obregon-technical.pdf",
      fileName: "mx-cdmx-alvaro-obregon-technical.pdf",
      contentType: "application/pdf",
      generatedAt: "2024-01-15T11:00:00Z",
    },
  };
  const findings = [reportReadyFindingFixture as FindingDto];
  const base = targetApprovedFixture as TargetListItemDto;

  return {
    ...base,
    source: "fixture",
    summary:
      "Passive evidence is normalized, the validation plan is approved, one confirmed finding is report-ready, and demo PDF artifacts are available.",
    approvalStatus: "approved",
    validationLevel: "controlled_validation",
    rateLimit: 10,
    allowedAssets: [base.primaryUrl],
    deniedAssets: [],
    latestRun: APPROVED_WORKFLOW_RUN,
    evidence,
    hypothesis: vulnerabilityHypothesisFixture as VulnerabilityHypothesisDto,
    testPlan: testPlanFixture as TestPlanDto,
    approvalGate: approvalGateFixture as ApprovalGateDto,
    validation,
    findings,
    reportArtifact,
    reportDownloads: buildReportDownloads(base.targetId, reportArtifact),
    auditEvents: auditEventFixture as unknown as AuditEventDto[],
    coverage: 100,
    alerts: 1,
    nextActionLabel: "Open reports",
    nextActionTo: "/guardian/reports",
  };
}

function buildRejectedFixtureRecord(): PipelineTargetRecord {
  const fixture = rejectedTargetFixture as {
    targetProfile: TargetListItemDto;
    approvalGate: ApprovalGateDto;
    workflowRun: WorkflowRunDto;
    auditEvents?: AuditEventDto[];
  };

  return {
    ...fixture.targetProfile,
    source: "fixture",
    summary:
      "The intake gate rejected this target because the submitted classification is out of scope for the authorized pipeline.",
    approvalStatus: "rejected",
    validationLevel: "passive",
    rateLimit: 0,
    allowedAssets: [],
    deniedAssets: [fixture.targetProfile.primaryUrl],
    latestRun: fixture.workflowRun,
    evidence: null,
    hypothesis: null,
    testPlan: null,
    approvalGate: fixture.approvalGate,
    validation: null,
    findings: [],
    reportArtifact: null,
    reportDownloads: [],
    auditEvents: fixture.auditEvents ?? [],
    coverage: 5,
    alerts: 1,
    nextActionLabel: "Review scope",
    nextActionTo: `/targets/${fixture.targetProfile.targetId}`,
  };
}

function buildSessionRecord(target: StoredDemoTarget): PipelineTargetRecord {
  const latestRun: WorkflowRunDto = target.workflowRun ?? {
    runId: target.runId,
    targetId: target.targetId,
    status: target.status,
    startedAt: target.createdAt,
    currentPhase: target.currentPhase,
  };

  const approvalStatus = target.status === "rejected" ? "rejected" : "approved";

  return {
    targetId: target.targetId,
    name: target.name,
    primaryUrl: target.primaryUrl,
    riskTier: target.riskTier,
    classification: target.classification,
    geography: target.geography,
    population: target.population,
    latitude: target.latitude,
    longitude: target.longitude,
    source: "session",
    summary:
      approvalStatus === "rejected"
        ? "The submitted target is blocked until the intake scope is corrected."
        : "The target is registered and waiting for passive evidence collection and hypothesis generation.",
    approvalStatus,
    validationLevel: normalizeValidationLevel(target.validationLevel),
    rateLimit: target.rateLimit ?? 10,
    allowedAssets: target.allowedAssets ?? [target.primaryUrl],
    deniedAssets: target.deniedAssets ?? [],
    latestRun,
    evidence: null,
    hypothesis: null,
    testPlan: null,
    approvalGate:
      approvalStatus === "approved"
        ? {
            gateId: `${target.runId}-intake`,
            targetId: target.targetId,
            gateType: "intake",
            status: "approved",
            requestedAt: target.createdAt,
            requestedBy: target.approverName ?? "operator",
            approvedAt: target.createdAt,
            approvedBy: target.approverName ?? "operator",
          }
        : null,
    validation: null,
    findings: [],
    reportArtifact: null,
    reportDownloads: [],
    auditEvents: target.auditEvents ?? [
      {
        eventId: `${target.runId}-created`,
        targetId: target.targetId,
        eventType: "target-created",
        actor: target.approverName ?? "operator",
        timestamp: target.createdAt,
        runId: target.runId,
        details: {
          classification: target.classification,
          validationLevel: normalizeValidationLevel(target.validationLevel),
        },
      },
    ],
    coverage: 12,
    alerts: 0,
    nextActionLabel: "Open target",
    nextActionTo: `/targets/${target.targetId}`,
  };
}

function buildConvexRecord(target: TargetListItemDto): PipelineTargetRecord {
  const metadata = getObjectValue(
    "metadata" in target ? target.metadata : undefined,
  );
  const latestRun =
    "latestRun" in target && target.latestRun
      ? (target.latestRun as WorkflowRunDto)
      : null;

  const allowedAssets = getStringArray(metadata?.allowedAssets) || [
    target.primaryUrl,
  ];
  const deniedAssets = getStringArray(metadata?.deniedAssets);
  const validationLevel = normalizeValidationLevel(metadata?.validationLevel);
  const reportArtifact = null;
  const evidence = null;
  const testPlan = null;
  const validation = null;
  const approvalStatus =
    latestRun?.status === "rejected" ? "rejected" : "approved";

  return {
    ...target,
    source: "convex",
    summary:
      latestRun?.status === "completed"
        ? "The workflow completed, but richer evidence and report artifacts are still pending publication in the dashboard adapter."
        : latestRun
          ? "The target is in the authorized pipeline and awaiting the next operational stage."
          : "The target profile exists, but no workflow run has been attached yet.",
    approvalStatus,
    validationLevel,
    rateLimit:
      typeof metadata?.rateLimit === "number" ? metadata.rateLimit : 10,
    allowedAssets,
    deniedAssets,
    latestRun,
    evidence,
    hypothesis: null,
    testPlan,
    approvalGate: null,
    validation,
    findings: [],
    reportArtifact,
    reportDownloads: [],
    auditEvents: [],
    coverage: deriveCoverage({
      approvalStatus,
      evidence,
      testPlan,
      validation,
      reportArtifact,
    }),
    alerts: 0,
    nextActionLabel: latestRun ? "Open target" : "Review intake",
    nextActionTo: `/targets/${target.targetId}`,
  };
}

export function getFixturePipelineRecords(): PipelineTargetRecord[] {
  return [buildApprovedFixtureRecord(), buildRejectedFixtureRecord()];
}

export function readStoredDemoTargets(): StoredDemoTarget[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DEMO_TARGET_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is StoredDemoTarget => {
      const item = getObjectValue(entry);
      return (
        !!item &&
        typeof item.targetId === "string" &&
        typeof item.name === "string" &&
        typeof item.primaryUrl === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.runId === "string"
      );
    });
  } catch {
    return [];
  }
}

export function writeStoredDemoTarget(target: StoredDemoTarget) {
  if (typeof window === "undefined") {
    return;
  }

  const next = [
    target,
    ...readStoredDemoTargets().filter(
      (entry) => entry.targetId !== target.targetId,
    ),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  window.localStorage.setItem(DEMO_TARGET_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("openbreach:demo-targets-changed"));
}

export function buildPipelineRecords(options: {
  source: "fixture" | "convex";
  targets?: TargetListItemDto[];
  storedTargets?: StoredDemoTarget[];
}): PipelineTargetRecord[] {
  if (options.source === "fixture") {
    return [
      ...getFixturePipelineRecords(),
      ...(options.storedTargets ?? []).map(buildSessionRecord),
    ].sort(comparePipelineTargets);
  }

  return (options.targets ?? [])
    .map(buildConvexRecord)
    .sort(comparePipelineTargets);
}

function comparePipelineTargets(
  left: PipelineTargetRecord,
  right: PipelineTargetRecord,
) {
  return (
    right.coverage - left.coverage ||
    getRiskWeight(right.riskTier) - getRiskWeight(left.riskTier) ||
    left.name.localeCompare(right.name)
  );
}

export function getFindingTone(
  severity: FindingDto["severity"] | undefined,
): PipelineTone {
  switch (severity) {
    case "critical":
    case "high":
      return "red";
    case "medium":
      return "amber";
    case "low":
    case "info":
    default:
      return "green";
  }
}

export function getWorkflowTone(
  status: WorkflowRunDto["status"] | undefined,
): PipelineTone {
  switch (status) {
    case "rejected":
    case "failed":
    case "halted":
      return "red";
    case "completed":
      return "green";
    case "running":
    case "paused":
      return "cyan";
    case "pending":
    default:
      return "amber";
  }
}

export function formatWorkflowPhase(phase: string | undefined): string {
  if (!phase) {
    return "UNASSIGNED";
  }

  return phase.replaceAll("-", " ").toUpperCase();
}

export function formatWorkflowStatus(status: string | undefined): string {
  return (status ?? "pending").replaceAll("-", "_").toUpperCase();
}

export function formatClassification(
  value: TargetListItemDto["classification"],
): string {
  return value.replaceAll("-", " ").toUpperCase();
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function formatDurationMs(ms: number | undefined): string {
  if (!ms || ms < 1_000) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(ms / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function buildPipelineAlerts(targets: PipelineTargetRecord[]): {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  tone: PipelineTone;
  targetId?: string;
}[] {
  return targets
    .flatMap((target) => {
      if (target.approvalStatus === "rejected") {
        return [
          {
            id: `${target.targetId}-rejected`,
            title: "INTAKE_REJECTED",
            body: `${target.name} is blocked by the intake scope gate.`,
            timestamp:
              target.approvalGate?.requestedAt ??
              target.latestRun?.abortedAt ??
              target.latestRun?.startedAt ??
              "",
            tone: "red" as const,
            targetId: target.targetId,
          },
        ];
      }

      const highestSeverity = getHighestFindingSeverity(target.findings);
      if (highestSeverity) {
        return [
          {
            id: `${target.targetId}-finding`,
            title: "REPORTABLE_FINDING",
            body: `${target.name} has a ${highestSeverity.toUpperCase()} severity item awaiting remediation.`,
            timestamp:
              target.validation?.executedAt ??
              target.reportArtifact?.generatedAt ??
              target.latestRun?.startedAt ??
              "",
            tone: getFindingTone(highestSeverity),
            targetId: target.targetId,
          },
        ];
      }

      if (target.latestRun?.status === "pending") {
        return [
          {
            id: `${target.targetId}-pending`,
            title: "PIPELINE_PENDING",
            body: `${target.name} is waiting for evidence collection and hypothesis generation.`,
            timestamp: target.latestRun.startedAt,
            tone: "cyan" as const,
            targetId: target.targetId,
          },
        ];
      }

      return [];
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 4);
}

export function getPipelineReportDownloads(
  targets: PipelineTargetRecord[],
): ReportDownloadEntry[] {
  const targetDownloads = targets.flatMap((target) => target.reportDownloads);
  return targetDownloads.length > 0 ? targetDownloads : DEMO_REPORT_DOWNLOADS;
}
