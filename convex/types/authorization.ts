export type AuthorizationScopeDto = {
  authorizationId: string;
  targetId: string;
  scopeType: "full" | "passive-only" | "limited" | "time-bound";
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  constraints?: string[];
  evidenceUrl?: string;
  isExpired: boolean;
};
