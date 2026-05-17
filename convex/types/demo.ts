import type { ApprovalGateDto } from "./approvals";
import type { FindingDto } from "./findings";
import type { VulnerabilityHypothesisDto } from "./hypotheses";
import type { PassiveScanEvidenceDto } from "./passiveScan";
import type { ReportArtifactDto } from "./reports";
import type { TargetListItemDto, TargetProfileDto } from "./targets";
import type { ValidationResultDto } from "./validation";
import type { WorkflowRunDto } from "./workflow";

export type DemoWorkflowRunSummaryDto = Pick<
  WorkflowRunDto,
  "runId" | "status" | "currentPhase"
>;

export type DemoTargetCardDto = TargetListItemDto & {
  latestRun: DemoWorkflowRunSummaryDto | null;
};

export type DemoEvidenceSummaryDto = Pick<
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
> & {
  errorCount: number;
};

export type DemoTargetDetailDto = {
  target: TargetProfileDto;
  latestRun: DemoWorkflowRunSummaryDto | null;
  evidence: DemoEvidenceSummaryDto[];
  hypotheses: VulnerabilityHypothesisDto[];
  approvals: ApprovalGateDto[];
  validationResults: ValidationResultDto[];
  findings: FindingDto[];
  reports: ReportArtifactDto[];
};
