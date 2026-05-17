import { authorizationScopeSchema } from "../src/shared/contracts.ts";
import {
  approvedTargetIntakeFixture,
  draftToFormState,
  evaluateTargetIntakeForm,
  rejectedTargetIntakeFixture,
} from "../src/features/target-intake/intake-flow.ts";

const approvedEvaluation = evaluateTargetIntakeForm(
  draftToFormState(approvedTargetIntakeFixture),
  "2026-05-16T18:00:00.000Z",
);

if (approvedEvaluation.state !== "approved") {
  throw new Error("Approved intake fixture should generate an approved scope.");
}

if (!approvedEvaluation.authorizationScope) {
  throw new Error(
    "Approved intake fixture must generate an AuthorizationScope.",
  );
}

authorizationScopeSchema.parse(approvedEvaluation.authorizationScope);

if (approvedEvaluation.networkActivityTriggered) {
  throw new Error("Target intake must not trigger network activity.");
}

const rejectedEvaluation = evaluateTargetIntakeForm(
  draftToFormState(rejectedTargetIntakeFixture),
  "2026-05-16T18:05:00.000Z",
);

if (rejectedEvaluation.state !== "rejected") {
  throw new Error("Rejected intake fixture should stay rejected.");
}

if (rejectedEvaluation.authorizationScope !== null) {
  throw new Error("Rejected intake must not emit an AuthorizationScope.");
}

if (rejectedEvaluation.auditEvents.length < 2) {
  throw new Error("Rejected intake must produce audit events.");
}

if (rejectedEvaluation.networkActivityTriggered) {
  throw new Error("Rejected intake must not trigger network activity.");
}

console.log("Target intake validation passed.");
