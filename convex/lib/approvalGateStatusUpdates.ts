import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireAdmin, requireApprover } from "../auth";
import { appendAuditEvent } from "./audit";

type UpdateStatusArgs = {
  gateId: string;
  status: Doc<"approvalGates">["status"];
  approvedAt?: string;
  rejectionReason?: string;
  bypassJustification?: string;
};

export async function buildApprovalGateStatusPatch(
  ctx: MutationCtx,
  doc: Doc<"approvalGates">,
  args: UpdateStatusArgs,
): Promise<Partial<Doc<"approvalGates">>> {
  const patch: Partial<Doc<"approvalGates">> = {
    status: args.status,
  };

  if (args.status === "approved") {
    const actor = await requireApprover(ctx);
    if (!args.approvedAt) {
      throw new Error('Approval status "approved" requires approvedAt.');
    }
    patch.approvedBy = actor.name ?? actor.tokenIdentifier;
    patch.approvedAt = args.approvedAt;
    patch.rejectionReason = undefined;
    patch.bypassJustification = undefined;
    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: "approval-granted",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: doc.runId,
      details: { gateId: args.gateId, gateType: doc.gateType },
    });
  }

  if (args.status === "rejected") {
    const actor = await requireApprover(ctx);
    if (!args.rejectionReason) {
      throw new Error('Approval status "rejected" requires rejectionReason.');
    }
    patch.rejectionReason = args.rejectionReason;
    patch.approvedBy = undefined;
    patch.approvedAt = undefined;
    patch.bypassJustification = undefined;
    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: "approval-rejected",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: doc.runId,
      details: { gateId: args.gateId, gateType: doc.gateType },
    });
  }

  if (args.status === "bypassed") {
    const actor = await requireAdmin(ctx);
    if (!args.bypassJustification || args.bypassJustification.length < 10) {
      throw new Error(
        'Approval status "bypassed" requires bypassJustification of at least 10 characters.',
      );
    }
    patch.bypassJustification = args.bypassJustification;
    patch.approvedBy = undefined;
    patch.approvedAt = undefined;
    patch.rejectionReason = undefined;
    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: "manual-override",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: doc.runId,
      details: {
        gateId: args.gateId,
        gateType: doc.gateType,
        action: "bypassed",
      },
    });
  }

  if (args.status === "pending") {
    const actor = await requireApprover(ctx);
    patch.approvedBy = undefined;
    patch.approvedAt = undefined;
    patch.rejectionReason = undefined;
    patch.bypassJustification = undefined;
    await appendAuditEvent(ctx, {
      targetId: doc.targetId,
      eventType: "approval-reset",
      actor: actor.name ?? actor.tokenIdentifier,
      runId: doc.runId,
      details: {
        gateId: args.gateId,
        gateType: doc.gateType,
        previousStatus: doc.status,
      },
    });
  }

  return patch;
}
