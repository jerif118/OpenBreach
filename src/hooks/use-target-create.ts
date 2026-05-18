import { useCallback, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type {
  AuditEventDto,
  AuthorizationScopeDto,
  TargetProfileDto,
  WorkflowRunDto,
} from "../../convex/types.js";
import { writeStoredDemoTarget } from "../features/openbreach/pipeline-data";
import {
  decideTargetScope,
  type AcceptedScopeDecision,
  type RejectedScopeDecision,
  type ValidationLevel,
} from "../shared/target-scope-decision.ts";

// ============================================================================
// Types
// ============================================================================

type TargetCreateBase = {
  targetId: string;
  name: string;
  riskTier: TargetProfileDto["riskTier"];
  classification: TargetProfileDto["classification"];
  runId: string;
  currentPhase: "intake";
  workflowRun: WorkflowRunDto;
  auditEvents: AuditEventDto[];
};

export type AcceptedTargetCreateResult = TargetCreateBase & {
  decision: "accepted";
  status: "pending";
  authorizationScope: AuthorizationScopeDto;
};

export type RejectedTargetCreateResult = TargetCreateBase & {
  decision: "rejected";
  status: "rejected";
  reason: string;
  authorizationScope: null;
};

/**
 * Client-visible intake result returned by Convex or deterministic fallback.
 */
export type TargetCreateResult =
  | AcceptedTargetCreateResult
  | RejectedTargetCreateResult;

function buildAcceptedResult(args: {
  input: CreateTargetArgs;
  decision: AcceptedScopeDecision;
  actor: string;
  nowISO: string;
  runId: string;
}): AcceptedTargetCreateResult {
  const authorizationScope: AuthorizationScopeDto = {
    authorizationId: `${args.runId}-authorization`,
    targetId: args.input.targetId,
    scopeType: args.decision.scopeType,
    grantedBy: args.actor,
    grantedAt: args.nowISO,
    constraints: args.decision.constraints,
    isExpired: false,
  };
  const workflowRun: WorkflowRunDto = {
    runId: args.runId,
    targetId: args.input.targetId,
    status: "pending",
    startedAt: args.nowISO,
    currentPhase: "intake",
    phases: [{ phase: "intake", enteredAt: args.nowISO }],
  };
  const auditEvents: AuditEventDto[] = [
    {
      eventId: `${args.runId}-target-created`,
      targetId: args.input.targetId,
      eventType: "target-created",
      actor: args.actor,
      timestamp: args.nowISO,
      runId: args.runId,
      details: {
        auditDecision: args.decision.auditDecision,
        validationLevel: args.decision.validationLevel,
        scopeType: args.decision.scopeType,
        rateLimit: args.decision.rateLimit,
      },
    },
    {
      eventId: `${args.runId}-approval-granted`,
      targetId: args.input.targetId,
      eventType: "approval-granted",
      actor: args.actor,
      timestamp: args.nowISO,
      runId: args.runId,
      details: { gateType: "intake", autoApproved: true },
    },
    {
      eventId: `${args.runId}-workflow-started`,
      targetId: args.input.targetId,
      eventType: "workflow-started",
      actor: args.actor,
      timestamp: args.nowISO,
      runId: args.runId,
      details: { phase: "intake", status: "pending" },
    },
  ];

  return {
    decision: "accepted",
    targetId: args.input.targetId,
    name: args.input.name,
    riskTier: "medium",
    classification: args.input.classification,
    runId: args.runId,
    status: "pending",
    currentPhase: "intake",
    authorizationScope,
    workflowRun,
    auditEvents,
  };
}

function buildRejectedResult(args: {
  input: CreateTargetArgs;
  decision: RejectedScopeDecision;
  actor: string;
  nowISO: string;
  runId: string;
}): RejectedTargetCreateResult {
  const workflowRun: WorkflowRunDto = {
    runId: args.runId,
    targetId: args.input.targetId,
    status: "rejected",
    startedAt: args.nowISO,
    abortedAt: args.nowISO,
    abortedReason: args.decision.reason,
    currentPhase: "intake",
    phases: [
      {
        phase: "intake",
        enteredAt: args.nowISO,
        exitedAt: args.nowISO,
        rejectionReason: args.decision.reason,
      },
    ],
  };
  const auditEvents: AuditEventDto[] = [
    {
      eventId: `${args.runId}-target-rejected`,
      targetId: args.input.targetId,
      eventType: "target-rejected",
      actor: args.actor,
      timestamp: args.nowISO,
      runId: args.runId,
      details: {
        auditDecision: args.decision.auditDecision,
        reason: args.decision.reason,
        primaryUrl: args.input.primaryUrl,
      },
    },
  ];

  return {
    decision: "rejected",
    targetId: args.input.targetId,
    name: args.input.name,
    riskTier: "medium",
    classification: args.input.classification,
    runId: args.runId,
    status: "rejected",
    currentPhase: "intake",
    reason: args.decision.reason,
    authorizationScope: null,
    workflowRun,
    auditEvents,
  };
}

function shouldUseDemoFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Authentication required") ||
    message.includes("not authenticated") ||
    message.includes("Connection refused") ||
    message.includes("WebSocket")
  );
}

function buildAndStoreDemoResult(args: {
  input: CreateTargetArgs;
  scopeDecision: ReturnType<typeof decideTargetScope>;
}): TargetCreateResult {
  const createdAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const actor = args.input.approverName ?? "fixture-demo-operator";
  const result =
    args.scopeDecision.status === "accepted"
      ? buildAcceptedResult({
          input: args.input,
          decision: args.scopeDecision,
          actor,
          nowISO: createdAt,
          runId,
        })
      : buildRejectedResult({
          input: args.input,
          decision: args.scopeDecision,
          actor,
          nowISO: createdAt,
          runId,
        });

  writeStoredDemoTarget({
    targetId: args.input.targetId,
    name: args.input.name,
    primaryUrl: args.input.primaryUrl,
    classification: args.input.classification,
    riskTier: "medium",
    geography: args.input.geography,
    population: args.input.population,
    latitude: args.input.latitude,
    longitude: args.input.longitude,
    createdAt,
    runId,
    status: result.status,
    currentPhase: "intake",
    approverName: args.input.approverName,
    validationLevel:
      args.scopeDecision.status === "accepted"
        ? args.scopeDecision.validationLevel
        : args.input.validationLevel,
    rateLimit:
      args.scopeDecision.status === "accepted"
        ? args.scopeDecision.rateLimit
        : args.input.rateLimit,
    allowedAssets:
      args.scopeDecision.status === "accepted"
        ? args.scopeDecision.allowedAssets.map(
            (asset) => asset.url ?? asset.host,
          )
        : args.input.allowedAssets,
    deniedAssets:
      args.scopeDecision.status === "accepted"
        ? args.scopeDecision.deniedAssets.map(
            (asset) => asset.url ?? asset.host,
          )
        : args.input.deniedAssets,
    scopeDecision:
      args.scopeDecision.status === "accepted"
        ? args.scopeDecision.metadata
        : {
            scopeDecision: "rejected",
            reason: args.scopeDecision.reason,
          },
    authorizationScope: result.authorizationScope,
    workflowRun: result.workflowRun,
    auditEvents: result.auditEvents,
  });

  return result;
}

export interface UseTargetCreateReturn {
  createTarget: (args: CreateTargetArgs) => Promise<TargetCreateResult>;
  isPending: boolean;
  error: Error | null;
  data: TargetCreateResult | null;
}

/**
 * Arguments accepted by `createTarget` — matches the Convex mutation args.
 */
export interface CreateTargetArgs {
  targetId: string;
  name: string;
  primaryUrl: string;
  classification: "public-sector" | "private" | "infrastructure" | "other";
  parentOrganization?: string;
  geography?: { country: string; region: string; city: string };
  population?: number;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  approverName?: string;
  allowedAssets?: string[];
  deniedAssets?: string[];
  validationLevel?: ValidationLevel;
  rateLimit?: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useTargetCreate(): UseTargetCreateReturn {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TargetCreateResult | null>(null);
  const isConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

  const mutate = isConfigured
    ? useMutation(api.targetsPublic.createFull)
    : null;

  const createTarget = useCallback(
    async (args: CreateTargetArgs): Promise<TargetCreateResult> => {
      setIsPending(true);
      setError(null);

      try {
        let result: TargetCreateResult;
        const scopeDecision = decideTargetScope({
          primaryUrl: args.primaryUrl,
          allowedAssets: args.allowedAssets,
          deniedAssets: args.deniedAssets,
          validationLevel: args.validationLevel,
          rateLimit: args.rateLimit,
        });

        if (!mutate) {
          result = buildAndStoreDemoResult({ input: args, scopeDecision });
        } else {
          try {
            result = await mutate(args);
          } catch (err) {
            if (!shouldUseDemoFallback(err)) {
              throw err;
            }
            result = buildAndStoreDemoResult({ input: args, scopeDecision });
          }
        }

        setData(result);
        return result;
      } catch (err) {
        const normalizedError =
          err instanceof Error
            ? err
            : new Error(String(err ?? "Target creation failed"));
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsPending(false);
      }
    },
    [mutate],
  );

  return { createTarget, isPending, error, data };
}
