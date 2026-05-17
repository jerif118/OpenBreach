import { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type { FindingDto, TargetListItemDto } from "../../convex/types.js";
import {
  buildPipelineAlerts,
  buildPipelineRecords,
  formatDurationMs,
  formatTimestamp,
  getPipelineReportDownloads,
  getWorkflowTone,
  readStoredDemoTargets,
  type PipelineTargetRecord,
  type ReportDownloadEntry,
  type StoredDemoTarget,
} from "../features/openbreach/pipeline-data";

const isConvexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

export interface DashboardMetrics {
  targetsInScope: number;
  pendingGates: number;
  reportsReady: number;
  coverage: number;
}

export interface RecentValidation {
  id: string;
  target: string;
  duration: string;
  status: "CLEARED" | "REVIEW" | "RUNNING" | "FAILED";
  statusTone: "green" | "red" | "cyan";
}

export interface PipelineStageSummary {
  label: string;
  value: number;
}

export interface OpenBreachPipelineData {
  alerts: ReturnType<typeof buildPipelineAlerts>;
  auditEvents: {
    actor: string;
    eventType: string;
    id: string;
    targetId: string;
    targetName: string;
    timestamp: string;
  }[];
  findings: (FindingDto & { targetName: string })[];
  isLoading: boolean;
  metrics: DashboardMetrics | null;
  recentValidations: RecentValidation[];
  reportDownloads: ReportDownloadEntry[];
  stageSummary: PipelineStageSummary[];
  targets: PipelineTargetRecord[];
}

function toRecentValidation(
  target: PipelineTargetRecord,
): RecentValidation | null {
  if (!target.latestRun) {
    return null;
  }

  if (target.approvalStatus === "rejected") {
    return {
      id: target.latestRun.runId,
      target: target.name,
      duration: formatDurationMs(target.latestRun.durationMs),
      status: "FAILED",
      statusTone: "red",
    };
  }

  if (target.validation) {
    return {
      id: target.validation.resultId,
      target: target.name,
      duration: formatDurationMs(target.latestRun.durationMs),
      status: target.validation.status === "passed" ? "CLEARED" : "REVIEW",
      statusTone: target.validation.status === "passed" ? "green" : "red",
    };
  }

  if (
    target.latestRun.status === "running" ||
    target.latestRun.status === "paused"
  ) {
    return {
      id: target.latestRun.runId,
      target: target.name,
      duration: formatDurationMs(target.latestRun.durationMs),
      status: "RUNNING",
      statusTone: "cyan",
    };
  }

  if (target.latestRun.status === "pending") {
    return {
      id: target.latestRun.runId,
      target: target.name,
      duration: formatDurationMs(target.latestRun.durationMs),
      status: "RUNNING",
      statusTone: "cyan",
    };
  }

  if (target.latestRun.status === "completed") {
    return {
      id: target.latestRun.runId,
      target: target.name,
      duration: formatDurationMs(target.latestRun.durationMs),
      status: "CLEARED",
      statusTone: "green",
    };
  }

  return {
    id: target.latestRun.runId,
    target: target.name,
    duration: formatDurationMs(target.latestRun.durationMs),
    status: "FAILED",
    statusTone: "red",
  };
}

function buildMetrics(targets: PipelineTargetRecord[]): DashboardMetrics {
  const targetsInScope = targets.filter(
    (target) => target.approvalStatus === "approved",
  ).length;
  const pendingGates = targets.filter(
    (target) =>
      target.approvalStatus === "approved" &&
      (!target.evidence || !target.validation || !target.reportArtifact),
  ).length;
  const reportsReady = targets.filter(
    (target) => target.reportArtifact?.status === "completed",
  ).length;
  const coverage = targets.length
    ? Math.round(
        targets.reduce((total, target) => total + target.coverage, 0) /
          targets.length,
      )
    : 0;

  return {
    targetsInScope,
    pendingGates,
    reportsReady,
    coverage,
  };
}

function buildStageSummary(
  targets: PipelineTargetRecord[],
): PipelineStageSummary[] {
  return [
    {
      label: "Intake",
      value: targets.filter(
        (target) => target.latestRun?.currentPhase === "intake",
      ).length,
    },
    {
      label: "Evidence",
      value: targets.filter((target) => !!target.evidence).length,
    },
    {
      label: "Approval",
      value: targets.filter((target) => !!target.testPlan).length,
    },
    {
      label: "Validation",
      value: targets.filter((target) => !!target.validation).length,
    },
    {
      label: "Reports",
      value: targets.filter(
        (target) => target.reportArtifact?.status === "completed",
      ).length,
    },
  ];
}

function buildAuditEvents(targets: PipelineTargetRecord[]) {
  return targets
    .flatMap((target) =>
      target.auditEvents.map((event) => ({
        actor: event.actor,
        eventType: event.eventType,
        id: event.eventId,
        targetId: target.targetId,
        targetName: target.name,
        timestamp: event.timestamp,
      })),
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function buildFindings(targets: PipelineTargetRecord[]) {
  return targets
    .flatMap((target) =>
      target.findings.map((finding) => ({
        ...finding,
        targetName: target.name,
      })),
    )
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.targetName.localeCompare(right.targetName),
    );
}

export function useOpenBreachPipeline(): OpenBreachPipelineData {
  const [storedTargets, setStoredTargets] = useState<StoredDemoTarget[]>([]);
  const targetsResult = isConvexConfigured
    ? useQuery(api.targetsPublic.list, { limit: 100 })
    : undefined;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sync = () => {
      setStoredTargets(readStoredDemoTargets());
    };

    sync();
    window.addEventListener(
      "openbreach:demo-targets-changed",
      sync as EventListener,
    );
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(
        "openbreach:demo-targets-changed",
        sync as EventListener,
      );
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isLoading = isConvexConfigured && targetsResult === undefined;
  const targets = isConvexConfigured
    ? buildPipelineRecords({
        source: "convex",
        targets: (targetsResult ?? []) as TargetListItemDto[],
      })
    : buildPipelineRecords({
        source: "fixture",
        storedTargets,
      });
  const metrics = isLoading ? null : buildMetrics(targets);
  const recentValidations = targets
    .map(toRecentValidation)
    .filter((validation): validation is RecentValidation => !!validation)
    .slice(0, 6);
  const alerts = buildPipelineAlerts(targets);
  const reportDownloads = getPipelineReportDownloads(targets);
  const stageSummary = buildStageSummary(targets);
  const auditEvents = buildAuditEvents(targets);
  const findings = buildFindings(targets);

  return {
    alerts,
    auditEvents,
    findings,
    isLoading,
    metrics,
    recentValidations,
    reportDownloads,
    stageSummary,
    targets,
  };
}

export function getTargetStatusTone(target: PipelineTargetRecord) {
  if (target.findings.length > 0) {
    return getWorkflowTone("failed");
  }

  return getWorkflowTone(target.latestRun?.status);
}

export function getTargetLastUpdated(target: PipelineTargetRecord) {
  return formatTimestamp(
    target.reportArtifact?.generatedAt ??
      target.validation?.executedAt ??
      target.approvalGate?.approvedAt ??
      target.evidence?.collectedAt ??
      target.latestRun?.startedAt,
  );
}
