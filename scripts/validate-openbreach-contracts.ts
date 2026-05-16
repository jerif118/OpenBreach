import approvedTargetFixture from "../data/targets/approved-target.json" with { type: "json" };
import rejectedTargetFixture from "../data/targets/rejected-target.json" with { type: "json" };
import passiveEvidenceFixture from "../data/evidence/passive-evidence.json" with { type: "json" };
import hypothesisFixture from "../data/hypotheses/hypothesis.json" with { type: "json" };
import approvalGateFixture from "../data/gates/approval-gate.json" with { type: "json" };
import validationResultFixture from "../data/validations/validation-result.json" with { type: "json" };
import reportReadyFindingFixture from "../data/findings/report-ready-finding.json" with { type: "json" };

import {
  targetProfileSchema,
  passiveScanEvidenceSchema,
  vulnerabilityHypothesisSchema,
  approvalGateSchema,
  validationResultSchema,
  findingSchema,
} from "../src/shared/contracts.ts";

// Validate all fixtures against their schemas
targetProfileSchema.parse(approvedTargetFixture);
console.log("✓ approved-target.json validated");

targetProfileSchema.parse(rejectedTargetFixture);
console.log("✓ rejected-target.json validated");

passiveScanEvidenceSchema.parse(passiveEvidenceFixture);
console.log("✓ passive-evidence.json validated");

vulnerabilityHypothesisSchema.parse(hypothesisFixture);
console.log("✓ hypothesis.json validated");

approvalGateSchema.parse(approvalGateFixture);
console.log("✓ approval-gate.json validated");

validationResultSchema.parse(validationResultFixture);
console.log("✓ validation-result.json validated");

findingSchema.parse(reportReadyFindingFixture);
console.log("✓ report-ready-finding.json validated");

// Negative case: malformed URL must be rejected
const badUrlResult = targetProfileSchema.safeParse({
  targetId: "tgt_test",
  assetId: "ast_test",
  organizationName: "Test Org",
  canonicalUrl: "not-a-valid-url",
});
if (badUrlResult.success) {
  throw new Error("Invalid URL must be rejected by TargetProfileSchema");
}
console.log("✓ negative case (malformed URL) correctly rejected");

console.log("OpenBreach fixture validation passed.");