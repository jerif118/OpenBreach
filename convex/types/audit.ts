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
