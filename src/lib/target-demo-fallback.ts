import type {
  ApprovalGateDto,
  DemoEvidenceSummaryDto,
  DemoTargetCardDto,
  DemoTargetDetailDto,
  DemoWorkflowRunSummaryDto,
  FindingDto,
  PassiveScanEvidenceDto,
  ReportArtifactDto,
  TargetProfileDto,
  ValidationResultDto,
  VulnerabilityHypothesisDto,
  WorkflowRunDto,
} from "../../convex/types.js";

import approvalGate from "../../data/targets/approval-gate.json" with { type: "json" };
import passiveEvidence from "../../data/targets/passive-evidence-record.json" with { type: "json" };
import rejectedTarget from "../../data/targets/rejected-target.json" with { type: "json" };
import reportArtifact from "../../data/targets/report-artifact.json" with { type: "json" };
import reportReadyFinding from "../../data/targets/report-ready-finding.json" with { type: "json" };
import targetApprovedPublic from "../../data/targets/target-approved-public.json" with { type: "json" };
import validationResult from "../../data/targets/validation-result.json" with { type: "json" };
import vulnerabilityHypothesis from "../../data/targets/vulnerability-hypothesis.json" with { type: "json" };

type FixtureTargetRecord = {
  target: TargetProfileDto;
  latestRun: DemoWorkflowRunSummaryDto | null;
  evidence: DemoEvidenceSummaryDto[];
  hypotheses: VulnerabilityHypothesisDto[];
  approvals: ApprovalGateDto[];
  validationResults: ValidationResultDto[];
  findings: FindingDto[];
  reports: ReportArtifactDto[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mapTargetProfile(fixture: unknown): TargetProfileDto {
  const source = asRecord(fixture);
  const profile = asRecord(source.targetProfile ?? source);

  return {
    targetId: String(profile.targetId ?? ""),
    name: String(profile.name ?? ""),
    primaryUrl: String(profile.primaryUrl ?? ""),
    riskTier: (profile.riskTier as TargetProfileDto["riskTier"]) ?? "medium",
    classification:
      (profile.classification as TargetProfileDto["classification"]) ?? "other",
    parentOrganization: profile.parentOrganization
      ? String(profile.parentOrganization)
      : undefined,
    geography: profile.geography
      ? {
          country: String(asRecord(profile.geography).country ?? ""),
          region: String(asRecord(profile.geography).region ?? ""),
          city: String(asRecord(profile.geography).city ?? ""),
        }
      : undefined,
    population:
      profile.population !== undefined ? Number(profile.population) : undefined,
    latitude: profile.latitude !== undefined ? Number(profile.latitude) : undefined,
    longitude:
      profile.longitude !== undefined ? Number(profile.longitude) : undefined,
  };
}

function mapWorkflowRunSummary(
  run: WorkflowRunDto | undefined,
): DemoWorkflowRunSummaryDto | null {
  if (!run) return null;
  return {
    runId: run.runId,
    status: run.status,
    currentPhase: run.currentPhase,
  };
}

type FixturePassiveEvidence = Pick<
  PassiveScanEvidenceDto,
  | "evidenceId"
  | "source"
  | "collectedAt"
  | "requestedUrl"
  | "reachable"
  | "httpStatus"
  | "cms"
  | "adminExposure"
  | "runId"
  | "errors"
>;

function mapEvidenceSummary(evidence: FixturePassiveEvidence): DemoEvidenceSummaryDto {
  return {
    evidenceId: evidence.evidenceId,
    source: evidence.source,
    collectedAt: evidence.collectedAt,
    requestedUrl: evidence.requestedUrl,
    reachable: evidence.reachable,
    httpStatus: evidence.httpStatus,
    cms: evidence.cms,
    adminExposure: evidence.adminExposure,
    runId: evidence.runId,
    errorCount: evidence.errors?.length ?? 0,
  };
}

function buildFixtureRecords(): FixtureTargetRecord[] {
  const approvedTarget = mapTargetProfile(targetApprovedPublic);
  const rejectedProfile = mapTargetProfile(rejectedTarget);
  const rejectedRun = asRecord(rejectedTarget).workflowRun as WorkflowRunDto;

  return [
    {
      target: approvedTarget,
      latestRun: null,
      evidence: [mapEvidenceSummary(passiveEvidence as FixturePassiveEvidence)],
      hypotheses: [vulnerabilityHypothesis as VulnerabilityHypothesisDto],
      approvals: [approvalGate as ApprovalGateDto],
      validationResults: [validationResult as unknown as ValidationResultDto],
      findings: [reportReadyFinding as FindingDto],
      reports: [reportArtifact as ReportArtifactDto],
    },
    {
      target: rejectedProfile,
      latestRun: mapWorkflowRunSummary(rejectedRun),
      evidence: [],
      hypotheses: [],
      approvals: [asRecord(rejectedTarget).approvalGate as ApprovalGateDto],
      validationResults: [],
      findings: [],
      reports: [],
    },
  ];
}

export function buildDemoTargetListFromFixtures(): DemoTargetCardDto[] {
  return buildFixtureRecords().map(({ target, latestRun }) => ({
    targetId: target.targetId,
    name: target.name,
    primaryUrl: target.primaryUrl,
    riskTier: target.riskTier,
    classification: target.classification,
    latestRun,
  }));
}

export function buildDemoTargetDetailFromFixtures(
  targetId: string,
): DemoTargetDetailDto | null {
  const record = buildFixtureRecords().find((item) => item.target.targetId === targetId);
  if (!record) return null;
  return {
    target: record.target,
    latestRun: record.latestRun,
    evidence: record.evidence,
    hypotheses: record.hypotheses,
    approvals: record.approvals,
    validationResults: record.validationResults,
    findings: record.findings,
    reports: record.reports,
  };
}
