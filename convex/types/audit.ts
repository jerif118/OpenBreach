export type AuditDetails = Record<string, string | number | boolean | null>;

export type AuditEventDto = {
  eventId: string;
  targetId: string;
  eventType: string;
  actor: string;
  timestamp: string;
  runId?: string;
  details?: AuditDetails;
  ipAddress?: string;
  userAgent?: string;
};
