import { z } from "zod";

import approvedTargetFixture from "../data/targets/approved-target.json" with { type: "json" };
import rejectedTargetFixture from "../data/targets/rejected-target.json" with { type: "json" };
import passiveEvidenceFixture from "../data/evidence/passive-evidence.json" with { type: "json" };
import hypothesisFixture from "../data/hypotheses/hypothesis.json" with { type: "json" };
import approvalGateFixture from "../data/gates/approval-gate.json" with { type: "json" };
import validationResultFixture from "../data/validations/validation-result.json" with { type: "json" };
import reportReadyFindingFixture from "../data/findings/report-ready-finding.json" with { type: "json" };

import authorizationScopeFixture from "../data/scopes/authorization-scope.json" with { type: "json" };
import workflowRunFixture from "../data/workflows/workflow-run.json" with { type: "json" };
import technologyFingerprintFixture from "../data/fingerprints/technology-fingerprint.json" with { type: "json" };
import testPlanFixture from "../data/plans/test-plan.json" with { type: "json" };
import evidenceEnvelopeFixture from "../data/envelopes/evidence-envelope.json" with { type: "json" };
import reportArtifactFixture from "../data/artifacts/report-artifact.json" with { type: "json" };
import auditEventFixture from "../data/audit/audit-event.json" with { type: "json" };

import {
  targetProfileSchema,
  authorizationScopeSchema,
  workflowRunSchema,
  passiveScanEvidenceSchema,
  technologyFingerprintSchema,
  vulnerabilityHypothesisSchema,
  testPlanSchema,
  approvalGateSchema,
  validationResultSchema,
  evidenceEnvelopeSchema,
  findingSchema,
  reportArtifactSchema,
  auditEventSchema,
} from "../src/shared/contracts.ts";

interface PositiveCase {
  schema: z.ZodTypeAny;
  fixture: unknown;
  label: string;
}

interface NegativeCase {
  schema: z.ZodTypeAny;
  data: unknown;
  label: string;
}

const positiveCases: PositiveCase[] = [
  { schema: targetProfileSchema, fixture: approvedTargetFixture, label: "approved-target.json" },
  { schema: targetProfileSchema, fixture: rejectedTargetFixture, label: "rejected-target.json" },
  { schema: passiveScanEvidenceSchema, fixture: passiveEvidenceFixture, label: "passive-evidence.json" },
  { schema: vulnerabilityHypothesisSchema, fixture: hypothesisFixture, label: "hypothesis.json" },
  { schema: approvalGateSchema, fixture: approvalGateFixture, label: "approval-gate.json" },
  { schema: validationResultSchema, fixture: validationResultFixture, label: "validation-result.json" },
  { schema: findingSchema, fixture: reportReadyFindingFixture, label: "report-ready-finding.json" },
  { schema: authorizationScopeSchema, fixture: authorizationScopeFixture, label: "authorization-scope.json" },
  { schema: workflowRunSchema, fixture: workflowRunFixture, label: "workflow-run.json" },
  { schema: technologyFingerprintSchema, fixture: technologyFingerprintFixture, label: "technology-fingerprint.json" },
  { schema: testPlanSchema, fixture: testPlanFixture, label: "test-plan.json" },
  { schema: evidenceEnvelopeSchema, fixture: evidenceEnvelopeFixture, label: "evidence-envelope.json" },
  { schema: reportArtifactSchema, fixture: reportArtifactFixture, label: "report-artifact.json" },
  { schema: auditEventSchema, fixture: auditEventFixture, label: "audit-event.json" },
];

const negativeCases: NegativeCase[] = [
  {
    schema: targetProfileSchema,
    data: { ...approvedTargetFixture, canonicalUrl: "not-a-valid-url" },
    label: "malformed URL",
  },
  {
    schema: approvalGateSchema,
    data: { ...approvalGateFixture, status: "rejected", reviewedAt: undefined, reviewerId: undefined },
    label: "rejected approval gate missing reviewer",
  },
  {
    schema: validationResultSchema,
    data: { ...validationResultFixture, status: "confirmed", completedAt: undefined },
    label: "confirmed validation missing completedAt",
  },
  {
    schema: authorizationScopeSchema,
    data: { ...authorizationScopeFixture, validUntil: "2026-05-15T10:00:00.000Z" },
    label: "authorization scope with invalid duration",
  },
];

let failed = false;

for (const { schema, fixture, label } of positiveCases) {
  try {
    schema.parse(fixture);
    console.log(`✓ ${label} validated`);
  } catch (error) {
    console.error(`✗ ${label} failed validation:`, error);
    failed = true;
  }
}

for (const { schema, data, label } of negativeCases) {
  const result = schema.safeParse(data);
  if (result.success) {
    console.error(`✗ negative case (${label}) should have been rejected but succeeded`);
    failed = true;
  } else {
    console.log(`✓ negative case (${label}) correctly rejected`);
  }
}

if (failed) {
  console.error("OpenBreach fixture validation failed.");
  process.exit(1);
}

console.log("OpenBreach fixture validation passed.");
