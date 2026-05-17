import type { MutationCtx } from "../_generated/server";

type AuditEventType =
  | "target-created"
  | "target-updated"
  | "target-rejected"
  | "workflow-started"
  | "workflow-completed"
  | "workflow-halted"
  | "phase-changed"
  | "evidence-recorded"
  | "hypothesis-proposed"
  | "approval-requested"
  | "approval-granted"
  | "approval-rejected"
  | "gate-approved"
  | "gate-rejected"
  | "finding-created"
  | "finding-updated"
  | "validation-recorded"
  | "report-generated"
  | "report-completed"
  | "auth-granted"
  | "auth-revoked"
  | "manual-override";

type AuditDetails = Record<string, string | number | boolean | null>;

export async function appendAuditEvent(
  ctx: MutationCtx,
  args: {
    targetId: string;
    eventType: AuditEventType;
    actor: string;
    eventId?: string;
    timestamp?: string;
    runId?: string;
    details?: AuditDetails;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  const eventId = args.eventId ?? crypto.randomUUID();
  const id = await ctx.db.insert("auditEvents", {
    eventId,
    targetId: args.targetId,
    eventType: args.eventType,
    actor: args.actor,
    timestamp: args.timestamp ?? new Date().toISOString(),
    runId: args.runId,
    details: args.details,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
  });

  return { id, eventId };
}
