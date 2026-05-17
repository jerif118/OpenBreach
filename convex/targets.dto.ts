import type { Doc } from "./_generated/dataModel";
import type { TargetProfileDto } from "./types/targets";
import type { ApprovalGateDto } from "./types/approvals";
import type {
  DemoEvidenceSummaryDto,
  DemoTargetCardDto,
  DemoWorkflowRunSummaryDto,
} from "./types/demo";
import type { FindingDto } from "./types/findings";
import type { VulnerabilityHypothesisDto } from "./types/hypotheses";
import type { ReportArtifactDto } from "./types/reports";
import type { ValidationResultDto } from "./types/validation";

export function toTargetProfileDto(doc: Doc<"targets">): TargetProfileDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    parentOrganization: doc.parentOrganization ?? undefined,
    geography: doc.geography
      ? {
          country: doc.geography.country,
          region: doc.geography.region,
          city: doc.geography.city,
        }
      : undefined,
    population: doc.population ?? undefined,
    latitude: doc.latitude ?? undefined,
    longitude: doc.longitude ?? undefined,
  };
}

export function toDemoTargetCardDto(
  doc: Doc<"targets">,
  latestRun: DemoWorkflowRunSummaryDto | null,
): DemoTargetCardDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    latestRun,
  };
}

export function toWorkflowRunSummaryDto(
  doc: Doc<"workflowRuns"> | undefined,
): DemoWorkflowRunSummaryDto | null {
  if (!doc) return null;
  return {
    runId: doc.runId,
    status: doc.status,
    currentPhase: doc.currentPhase ?? undefined,
  };
}

export function toEvidenceSummaryDto(
  doc: Doc<"passiveScanEvidence">,
): DemoEvidenceSummaryDto {
  return {
    evidenceId: doc.evidenceId,
    source: doc.source,
    collectedAt: doc.collectedAt,
    requestedUrl: doc.requestedUrl,
    reachable: doc.reachable,
    httpStatus: doc.httpStatus ?? undefined,
    cms: doc.cms ?? undefined,
    adminExposure: doc.adminExposure ?? undefined,
    runId: doc.runId ?? undefined,
    errorCount: doc.errors?.length ?? 0,
  };
}

export function toHypothesisDto(
  doc: Doc<"vulnerabilityHypotheses">,
): VulnerabilityHypothesisDto {
  return {
    hypothesisId: doc.hypothesisId,
    targetId: doc.targetId,
    title: doc.title,
    status: doc.status,
    createdAt: doc.createdAt,
    proposedBy: doc.proposedBy,
    description: doc.description ?? undefined,
    cweId: doc.cweId ?? undefined,
    cvssScore: doc.cvssScore ?? undefined,
    affectedComponents: doc.affectedComponents ?? undefined,
    prerequisites: doc.prerequisites ?? undefined,
    testPlanId: doc.testPlanId ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

export function toApprovalDto(doc: Doc<"approvalGates">): ApprovalGateDto {
  return {
    gateId: doc.gateId,
    targetId: doc.targetId,
    gateType: doc.gateType,
    status: doc.status,
    requestedAt: doc.requestedAt,
    requestedBy: doc.requestedBy,
    approvedBy: doc.approvedBy ?? undefined,
    approvedAt: doc.approvedAt ?? undefined,
    rejectionReason: doc.rejectionReason ?? undefined,
    bypassJustification: doc.bypassJustification ?? undefined,
    linkedArtifactId: doc.linkedArtifactId ?? undefined,
    runId: doc.runId ?? undefined,
  };
}

export function toValidationResultDto(
  doc: Doc<"validationResults">,
  findingCount: number,
): ValidationResultDto {
  return {
    resultId: doc.resultId,
    targetId: doc.targetId,
    status: doc.status,
    executedAt: doc.executedAt,
    executedBy: doc.executedBy,
    testPlanId: doc.testPlanId ?? undefined,
    hypothesisId: doc.hypothesisId ?? undefined,
    summary: doc.summary ?? undefined,
    evidenceRefs: doc.evidenceRefs ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
    findingCount,
  };
}

export function toFindingDto(doc: Doc<"findings">): FindingDto {
  return {
    findingId: doc.findingId,
    targetId: doc.targetId,
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    status: doc.status,
    createdAt: doc.createdAt,
    category: doc.category ?? undefined,
    evidence: doc.evidence ?? undefined,
    remediationHint: doc.remediationHint ?? undefined,
    affectedAssets: doc.affectedAssets ?? undefined,
    confidence: doc.confidence ?? undefined,
    cweId: doc.cweId ?? undefined,
    cvssScore: doc.cvssScore ?? undefined,
    validationResultId: doc.validationResultId ?? undefined,
    reportReady: doc.reportReady ?? undefined,
    runId: doc.runId ?? undefined,
  };
}

export function toReportDto(doc: Doc<"reportArtifacts">): ReportArtifactDto {
  return {
    artifactId: doc.artifactId,
    targetId: doc.targetId,
    variant: doc.variant,
    title: doc.title,
    generatedAt: doc.generatedAt,
    status: doc.status,
    findings: doc.findings,
    sections: doc.sections ?? undefined,
    pdf: doc.pdf ?? undefined,
    generatedBy: doc.generatedBy ?? undefined,
    runId: doc.runId ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}
