import assert from "node:assert/strict";
import http from "node:http";
import {
  approvalGateSchema,
  auditEventSchema,
  authorizationScopeSchema,
  testPlanSchema,
  validationResultSchema,
} from "../src/shared/contracts.ts";
import { runControlledValidation } from "../src/workflow/controlled-validation-runner.ts";

const NOW = "2026-05-17T14:00:00.000Z";
const TARGET = "tgt-validation-70";
const RUN = "run-validation-70";
const ACTOR = "fixture-operator";

function startFixtureServer(): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Server", "openbreach-validation-fixture");
      res.statusCode = 200;
      res.end("fixture-ok");
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (typeof addr !== "object" || !addr) {
        reject(new Error("no listen address"));
        return;
      }
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve({
        baseUrl,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

function approvedPlan(baseUrl: string) {
  return testPlanSchema.parse({
    planId: `${RUN}-plan`,
    targetId: TARGET,
    title: "Fixture validation plan",
    status: "approved",
    createdAt: NOW,
    steps: [
      {
        stepId: `${RUN}-step-1`,
        description: "Safe HTTP metadata read",
        expectedOutcome: "Response headers captured",
      },
    ],
    approver: ACTOR,
    approvedAt: NOW,
    runId: RUN,
    metadata: {
      allowedActions: ["HEAD", "GET"],
      forbiddenActions: ["POST", "PUT", "DELETE", "PATCH"],
      maxRequestsTotal: 2,
      stopConditions: ["max_requests", "out_of_scope"],
    },
  });
}

function pendingPlan(baseUrl: string) {
  const ap = approvedPlan(baseUrl);
  return testPlanSchema.parse({
    ...ap,
    status: "pending-approval",
    approver: undefined,
    approvedAt: undefined,
  });
}

function execGateApproved(expiresAt?: string) {
  return approvalGateSchema.parse({
    gateId: `${RUN}-exec-gate`,
    targetId: TARGET,
    gateType: "execution",
    status: "approved",
    requestedAt: NOW,
    requestedBy: ACTOR,
    approvedBy: ACTOR,
    approvedAt: NOW,
    linkedArtifactId: `${RUN}-plan`,
    runId: RUN,
    expiresAt,
  });
}

function execGatePending() {
  return approvalGateSchema.parse({
    gateId: `${RUN}-exec-gate`,
    targetId: TARGET,
    gateType: "execution",
    status: "pending",
    requestedAt: NOW,
    requestedBy: ACTOR,
    linkedArtifactId: `${RUN}-plan`,
    runId: RUN,
  });
}

function execGateRejected() {
  return approvalGateSchema.parse({
    gateId: `${RUN}-exec-gate`,
    targetId: TARGET,
    gateType: "execution",
    status: "rejected",
    requestedAt: NOW,
    requestedBy: ACTOR,
    rejectionReason: "operator_denied_active_validation",
    linkedArtifactId: `${RUN}-plan`,
    runId: RUN,
  });
}

function scopeForOrigin(baseUrl: string) {
  return authorizationScopeSchema.parse({
    authorizationId: `${RUN}-auth`,
    targetId: TARGET,
    scopeType: "limited",
    grantedBy: "fixture-owner",
    grantedAt: NOW,
    evidenceUrl: `${baseUrl}/`,
    constraints: [`allowed_origin:${new URL(baseUrl).origin}`],
  });
}

async function main() {
  const { baseUrl, close } = await startFixtureServer();
  try {
    const scope = scopeForOrigin(baseUrl);
    const origin = new URL(baseUrl).origin;

    // 1) Pending test plan cannot run
    {
      const r = await runControlledValidation({
        targetId: TARGET,
        runId: RUN,
        actor: ACTOR,
        now: NOW,
        authorizationScope: scope,
        testPlan: pendingPlan(baseUrl),
        approvalGate: execGateApproved(),
        validationBaseUrl: baseUrl,
        allowedOrigins: [origin],
      });
      validationResultSchema.parse(r.validationResult);
      assert.equal(r.validationResult.status, "blocked");
      assert.equal(
        (r.validationResult.metadata as { blockedReason?: string })
          ?.blockedReason,
        "test_plan_not_approved",
      );
    }

    // 2) Rejected gate -> blocked + gate-rejected audit
    {
      const r = await runControlledValidation({
        targetId: TARGET,
        runId: `${RUN}-b`,
        actor: ACTOR,
        now: NOW,
        authorizationScope: scope,
        testPlan: approvedPlan(baseUrl),
        approvalGate: execGateRejected(),
        validationBaseUrl: baseUrl,
        allowedOrigins: [origin],
      });
      assert.equal(r.validationResult.status, "blocked");
      assert.ok(
        r.auditTrail.some((e) => e.eventType === "gate-rejected"),
        "denied gate audited",
      );
      for (const ev of r.auditTrail) auditEventSchema.parse(ev);
    }

    // 3) Expired approved gate
    {
      const r = await runControlledValidation({
        targetId: TARGET,
        runId: `${RUN}-c`,
        actor: ACTOR,
        now: NOW,
        authorizationScope: scope,
        testPlan: approvedPlan(baseUrl),
        approvalGate: execGateApproved("2026-01-01T00:00:00.000Z"),
        validationBaseUrl: baseUrl,
        allowedOrigins: [origin],
      });
      assert.equal(r.validationResult.status, "blocked");
      assert.ok(
        r.auditTrail.some((e) => e.eventType === "gate-expired"),
        "expired gate audited",
      );
    }

    // 4) validation URL origin not in AuthorizationScope allow-list
    {
      const r = await runControlledValidation({
        targetId: TARGET,
        runId: `${RUN}-d`,
        actor: ACTOR,
        now: NOW,
        authorizationScope: scope,
        testPlan: approvedPlan(baseUrl),
        approvalGate: execGateApproved(),
        validationBaseUrl: baseUrl,
        allowedOrigins: ["http://127.0.0.1:1"],
      });
      assert.equal(r.validationResult.status, "blocked");
      assert.equal(
        (r.validationResult.metadata as { blockedReason?: string })
          ?.blockedReason,
        "validation_origin_not_allowed",
      );
    }

    // 5) Happy path
    {
      const r = await runControlledValidation({
        targetId: TARGET,
        runId: `${RUN}-e`,
        actor: ACTOR,
        now: NOW,
        authorizationScope: scope,
        testPlan: approvedPlan(baseUrl),
        approvalGate: execGateApproved(),
        validationBaseUrl: baseUrl,
        allowedOrigins: [origin],
      });
      assert.equal(r.validationResult.status, "passed");
      assert.ok(r.requestCount >= 1 && r.requestCount <= 2);
      assert.ok(
        r.auditTrail.some(
          (e) =>
            e.eventType === "validation-recorded" &&
            e.details?.status === "passed",
        ),
      );
      for (const ev of r.auditTrail) auditEventSchema.parse(ev);
    }

    // 6) Forbidden method in catalog blocks before network (HEAD disallowed, must not fall through to GET)
    {
      const badPlan = testPlanSchema.parse({
        ...approvedPlan(baseUrl),
        metadata: {
          allowedActions: ["GET"],
          forbiddenActions: ["HEAD", "POST"],
          maxRequestsTotal: 2,
        },
      });
      const r = await runControlledValidation({
        targetId: TARGET,
        runId: `${RUN}-f`,
        actor: ACTOR,
        now: NOW,
        authorizationScope: scope,
        testPlan: badPlan,
        approvalGate: execGateApproved(),
        validationBaseUrl: baseUrl,
        allowedOrigins: [origin],
      });
      assert.equal(r.validationResult.status, "blocked");
      assert.equal(r.requestCount, 0);
    }

    console.log("validate-approval-validation: all checks passed");
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
