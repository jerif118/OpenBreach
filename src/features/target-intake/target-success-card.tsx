import { Link } from "@tanstack/react-router";

import { FormCard } from "~/components/ui/FormCard.tsx";
import { CARD_SUCCESS } from "~/lib/terminal-styles";
import type { TargetCreateResult } from "~/hooks/use-target-create.ts";

function constraintValues(constraints: string[], prefix: string) {
  return constraints
    .filter((constraint) => constraint.startsWith(prefix))
    .map((constraint) => constraint.slice(prefix.length));
}

function constraintValue(constraints: string[], prefix: string) {
  return constraintValues(constraints, prefix)[0] ?? "unknown";
}

function formatConstraintValue(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

// ============================================================================
// Types
// ============================================================================

export interface TargetSuccessCardProps {
  target: TargetCreateResult;
}

// ============================================================================
// Component
// ============================================================================

export function TargetSuccessCard({ target }: TargetSuccessCardProps) {
  const isRejected = target.decision === "rejected";
  const constraints =
    target.decision === "accepted"
      ? (target.authorizationScope.constraints ?? [])
      : [];
  const allowedValidationClasses = constraintValues(
    constraints,
    "allowed-validation-class:",
  );
  const deniedActions = constraintValues(constraints, "denied-action:");
  const rateLimit = constraintValue(constraints, "rate-limit:");
  const approvalRequired = constraintValue(constraints, "approval-required:");

  return (
    <div className={`${CARD_SUCCESS} animate-terminal-glow`}>
      <div
        className={`${isRejected ? "text-error" : "text-secondary-fixed-dim"} mb-4 font-mono`}
      >
        <pre className="text-xs leading-4">
          {isRejected
            ? `    ____
   /    \\  TARGET REJECTED
  |  !!  |
   \\____/`
            : `    ____
   /    \\  TARGET CREATED
  |  ✓✓  |
   \\____/`}
        </pre>
      </div>

      <h2 className="font-display text-on-surface mb-2 text-2xl uppercase">
        {isRejected ? "Target intake rejected" : "Target intake completed"}
      </h2>

      <p className="text-on-surface-variant mb-4 font-mono text-sm">
        {isRejected
          ? "The intake gate blocked this target before creating an approved scope or starting downstream work."
          : "Approved intake scope created. This records authorization and workflow state only; downstream work still follows the listed safety constraints."}
      </p>

      <div className="border-secondary-fixed-dim/20 bg-surface pixel-corner mb-6 border px-4 py-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Target ID</dt>
            <dd className="text-on-surface font-mono">{target.targetId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Name</dt>
            <dd className="text-on-surface font-mono">{target.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Risk Tier</dt>
            <dd className="text-on-surface font-mono capitalize">
              {target.riskTier}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">
              Classification
            </dt>
            <dd className="text-on-surface font-mono">
              {target.classification}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Run ID</dt>
            <dd className="text-on-surface font-mono text-xs">
              {target.runId}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Status</dt>
            <dd className="text-on-surface font-mono">{target.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Phase</dt>
            <dd className="text-on-surface font-mono">{target.currentPhase}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Decision</dt>
            <dd className="text-on-surface font-mono uppercase">
              {target.decision}
            </dd>
          </div>
          {target.decision === "accepted" ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Approved intake scope
                </dt>
                <dd className="text-on-surface font-mono">
                  {target.authorizationScope.scopeType}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Allowed Validation
                </dt>
                <dd className="text-on-surface max-w-sm text-right font-mono capitalize">
                  {allowedValidationClasses.length > 0
                    ? allowedValidationClasses
                        .map(formatConstraintValue)
                        .join(", ")
                    : "See raw constraints"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Forbidden Actions
                </dt>
                <dd className="text-on-surface max-w-sm text-right font-mono capitalize">
                  {deniedActions.length > 0
                    ? deniedActions.map(formatConstraintValue).join(", ")
                    : "See raw constraints"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Rate Limit
                </dt>
                <dd className="text-on-surface font-mono">
                  {rateLimit} request units
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Approval Required
                </dt>
                <dd className="text-on-surface font-mono uppercase">
                  {approvalRequired}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Raw Constraints
                </dt>
                <dd className="text-on-surface max-w-sm text-right font-mono text-xs">
                  {constraints.join(", ")}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">Reason</dt>
                <dd className="text-on-surface max-w-sm text-right font-mono">
                  {target.reason}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant font-mono">
                  Safety outcome
                </dt>
                <dd className="text-on-surface max-w-sm text-right font-mono">
                  No approved scope was created. No downstream work started.
                </dd>
              </div>
            </>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant font-mono">Audit Events</dt>
            <dd className="text-on-surface font-mono">
              {target.auditEvents.map((event) => event.eventType).join(", ")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isRejected && (
          <Link
            to="/targets/$targetId"
            params={{ targetId: target.targetId }}
            className="border-primary/30 bg-primary/10 text-primary pixel-corner hover:bg-primary/15 focus:ring-primary/30 border px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
          >
            Open Target Detail
          </Link>
        )}
        <Link
          to="/targets"
          className="border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 text-secondary-fixed-dim pixel-corner hover:bg-secondary-fixed-dim/15 focus:ring-secondary-fixed-dim/30 border px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
        >
          ← Back to Target List
        </Link>
        {!isRejected && (
          <Link
            to="/targets"
            search={{ success: "created" }}
            className="border-outline/40 text-on-surface pixel-corner hover:bg-primary/10 hover:text-primary focus:ring-primary/30 border bg-transparent px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
          >
            View All Targets
          </Link>
        )}
      </div>
    </div>
  );
}
