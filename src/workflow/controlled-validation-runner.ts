/**
 * Approval-gated, bounded active validation (issue #70).
 * Performs at most one safe HTTP read against an explicitly allowed origin.
 */

import { createHash } from "node:crypto";
import type {
  ApprovalGate,
  AuditEvent,
  AuthorizationScope,
  EvidenceEnvelope,
  TestPlan,
  ValidationResult,
} from "../shared/contracts.ts";
import {
  evidenceEnvelopeSchema,
  validationResultSchema,
} from "../shared/contracts.ts";

export type ControlledValidationRequest = {
  targetId: string;
  runId: string;
  actor: string;
  now: string;
  authorizationScope: AuthorizationScope;
  testPlan: TestPlan;
  approvalGate: ApprovalGate;
  /** Full base URL for the validation request (e.g. http://127.0.0.1:51321). Its origin must appear in allowedOrigins. */
  validationBaseUrl: string;
  /** Declared allow-list of origins; the request origin is checked before any HTTP call. */
  allowedOrigins: string[];
  validationPath?: string;
  fetchImpl?: typeof fetch;
};

export type ControlledValidationRun = {
  validationResult: ValidationResult;
  evidenceEnvelope: EvidenceEnvelope;
  auditTrail: AuditEvent[];
  requestCount: number;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",")}}`;
}

function payloadHash(payload: unknown): string {
  return createHash("sha256")
    .update(stableStringify(payload), "utf8")
    .digest("hex")
    .slice(0, 24);
}

function normalizeOrigin(url: string): string {
  return new URL(url).origin;
}

function pushAudit(
  audits: AuditEvent[],
  seq: { i: number },
  ev: Omit<AuditEvent, "eventId">,
) {
  const runId = ev.runId ?? "";
  audits.push({
    ...ev,
    eventId: `${runId || "run"}-cval-audit-${seq.i++}`,
  });
}

export async function runControlledValidation(
  req: ControlledValidationRequest,
): Promise<ControlledValidationRun> {
  const fetchFn = req.fetchImpl ?? globalThis.fetch;
  const audits: AuditEvent[] = [];
  const seq = { i: 0 };
  const path =
    req.validationPath === undefined || req.validationPath === ""
      ? "/"
      : req.validationPath.startsWith("/")
        ? req.validationPath
        : `/${req.validationPath}`;

  const blocked = (
    code: string,
    extraMeta?: Record<string, string | number | boolean | null>,
  ): ControlledValidationRun => {
    const resultId = `${req.runId}-vr-${code}`;
    const vr: ValidationResult = {
      resultId,
      targetId: req.targetId,
      status: "blocked",
      executedAt: req.now,
      executedBy: req.actor,
      testPlanId: req.testPlan.planId,
      runId: req.runId,
      summary: code,
      metadata: {
        blockedReason: code,
        ...extraMeta,
      },
    };
    pushAudit(audits, seq, {
      targetId: req.targetId,
      eventType: "validation-recorded",
      actor: req.actor,
      timestamp: req.now,
      runId: req.runId,
      details: { resultId, blockedReason: code },
    });
    const envelope: EvidenceEnvelope = {
      envelopeId: `${req.runId}-env-${code}`,
      targetId: req.targetId,
      source: "system",
      recordedAt: req.now,
      payloadType: "test-result",
      payload: vr,
      runId: req.runId,
      hash: payloadHash(vr),
    };
    return {
      validationResult: validationResultSchema.parse(vr),
      evidenceEnvelope: evidenceEnvelopeSchema.parse(envelope),
      auditTrail: audits,
      requestCount: 0,
    };
  };

  if (req.testPlan.status !== "approved") {
    return blocked("test_plan_not_approved", {
      planStatus: req.testPlan.status,
    });
  }

  if (req.approvalGate.status !== "approved") {
    pushAudit(audits, seq, {
      targetId: req.targetId,
      eventType: "gate-rejected",
      actor: req.actor,
      timestamp: req.now,
      runId: req.runId,
      details: {
        gateId: req.approvalGate.gateId,
        gateStatus: String(req.approvalGate.status),
      },
    });
    return blocked("execution_gate_not_approved", {
      gateStatus: req.approvalGate.status,
    });
  }

  if (req.approvalGate.expiresAt) {
    if (new Date(req.approvalGate.expiresAt) <= new Date(req.now)) {
      pushAudit(audits, seq, {
        targetId: req.targetId,
        eventType: "gate-expired",
        actor: req.actor,
        timestamp: req.now,
        runId: req.runId,
        details: {
          gateId: req.approvalGate.gateId,
          expiresAt: req.approvalGate.expiresAt,
        },
      });
      return blocked("gate_expired");
    }
  }

  if (
    req.authorizationScope.expiresAt &&
    new Date(req.authorizationScope.expiresAt) <= new Date(req.now)
  ) {
    return blocked("authorization_scope_expired");
  }

  if (!req.allowedOrigins.length) {
    return blocked("no_allowed_origins");
  }

  const validationUrl = `${req.validationBaseUrl.replace(/\/$/, "")}${path}`;

  let requestOrigin: string;
  try {
    requestOrigin = normalizeOrigin(validationUrl);
  } catch {
    return blocked("invalid_validation_url");
  }

  const allowed = new Set(req.allowedOrigins.map((o) => normalizeOrigin(o)));
  if (!allowed.has(requestOrigin)) {
    return blocked("validation_origin_not_allowed");
  }

  const meta = req.testPlan.metadata as Record<string, unknown> | undefined;
  const allowedActions = (meta?.allowedActions as string[] | undefined) ?? [
    "HEAD",
    "GET",
  ];
  const forbidden = (meta?.forbiddenActions as string[] | undefined) ?? [];
  const maxRequests =
    typeof meta?.maxRequestsTotal === "number" ? meta.maxRequestsTotal : 2;

  const tryMethod = async (method: string): Promise<Response> => {
    if (forbidden.includes(method)) {
      throw new Error(`forbidden_action:${method}`);
    }
    if (!allowedActions.includes(method)) {
      throw new Error(`method_not_allowed:${method}`);
    }
    requestCount++;
    if (requestCount > maxRequests) {
      throw new Error("max_requests_exceeded");
    }
    return fetchFn(validationUrl, { method, redirect: "manual" });
  };

  let requestCount = 0;
  let res: Response;
  try {
    res = await tryMethod("HEAD");
    if (res.status === 405 || res.status === 501) {
      res = await tryMethod("GET");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "max_requests_exceeded") {
      return blocked("max_requests_exceeded", { maxRequests });
    }
    if (msg.startsWith("forbidden_action:") || msg.startsWith("method_not_allowed:")) {
      return blocked("unsafe_or_disallowed_http_method", { detail: msg });
    }
    const resultId = `${req.runId}-vr-error`;
    const vr: ValidationResult = {
      resultId,
      targetId: req.targetId,
      status: "error",
      executedAt: req.now,
      executedBy: req.actor,
      testPlanId: req.testPlan.planId,
      runId: req.runId,
      summary: "validation_fetch_failed",
      metadata: { error: msg },
    };
    pushAudit(audits, seq, {
      targetId: req.targetId,
      eventType: "validation-recorded",
      actor: req.actor,
      timestamp: req.now,
      runId: req.runId,
      details: { resultId, status: "error" },
    });
    const envelope: EvidenceEnvelope = {
      envelopeId: `${req.runId}-env-error`,
      targetId: req.targetId,
      source: "system",
      recordedAt: req.now,
      payloadType: "test-result",
      payload: vr,
      runId: req.runId,
      hash: payloadHash(vr),
    };
    return {
      validationResult: validationResultSchema.parse(vr),
      evidenceEnvelope: evidenceEnvelopeSchema.parse(envelope),
      auditTrail: audits,
      requestCount,
    };
  }

  const safeHeaders: Record<string, string> = {};
  const expose = ["cache-control", "content-type", "server"];
  for (const name of expose) {
    const v = res.headers.get(name);
    if (v) safeHeaders[name] = v;
  }

  const passed: ValidationResult = {
    resultId: `${req.runId}-vr-passed`,
    targetId: req.targetId,
    status: "passed",
    executedAt: req.now,
    executedBy: req.actor,
    testPlanId: req.testPlan.planId,
    runId: req.runId,
    summary: "safe_http_read_completed_within_scope",
    evidenceRefs: [`${validationUrl}#response-headers`],
    metadata: {
      httpStatus: res.status,
      requestCount,
      headerKeys: Object.keys(safeHeaders).join(","),
    },
  };

  pushAudit(audits, seq, {
    targetId: req.targetId,
    eventType: "validation-recorded",
    actor: req.actor,
    timestamp: req.now,
    runId: req.runId,
    details: {
      resultId: passed.resultId,
      status: "passed",
      httpStatus: res.status,
      requestCount,
    },
  });

  const envelope: EvidenceEnvelope = {
    envelopeId: `${req.runId}-env-passed`,
    targetId: req.targetId,
    source: "fixture",
    recordedAt: req.now,
    payloadType: "test-result",
    payload: passed,
    runId: req.runId,
    hash: payloadHash(passed),
    metadata: {
      collectedUrl: validationUrl,
      redactionStatus: "not_required",
      headerSample: safeHeaders,
    },
  };

  return {
    validationResult: validationResultSchema.parse(passed),
    evidenceEnvelope: evidenceEnvelopeSchema.parse(envelope),
    auditTrail: audits,
    requestCount,
  };
}
