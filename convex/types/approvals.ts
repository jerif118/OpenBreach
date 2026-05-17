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

export type ApprovalGateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "bypassed";
