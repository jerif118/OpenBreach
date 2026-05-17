import { Link } from "@tanstack/react-router";

import { FormCard } from "~/components/ui/FormCard.tsx";
import { CARD_SUCCESS } from "~/lib/terminal-styles";
import type { TargetCreateResult } from "~/hooks/use-target-create.ts";

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
  return (
    <div className={`${CARD_SUCCESS} animate-terminal-glow`}>
      <div className="text-secondary-fixed-dim mb-4 font-mono">
        <pre className="text-xs leading-4">
          {`    ____
   /    \\  TARGET CREATED
  |  ✓✓  |
   \\____/`}
        </pre>
      </div>

      <h2 className="font-display text-on-surface mb-2 text-2xl uppercase">
        Target intake completed
      </h2>

      <p className="text-on-surface-variant mb-4 font-mono text-sm">
        The target has been registered and auto-approved for the MVP workflow.
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
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/targets/$targetId"
          params={{ targetId: target.targetId }}
          className="border-primary/30 bg-primary/10 text-primary pixel-corner hover:bg-primary/15 focus:ring-primary/30 border px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
        >
          Open Target Detail
        </Link>
        <Link
          to="/targets"
          className="border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 text-secondary-fixed-dim pixel-corner hover:bg-secondary-fixed-dim/15 focus:ring-secondary-fixed-dim/30 border px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
        >
          ← Back to Target List
        </Link>
        <Link
          to="/targets"
          search={{ success: "created" }}
          className="border-outline/40 text-on-surface pixel-corner hover:bg-primary/10 hover:text-primary focus:ring-primary/30 border bg-transparent px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
        >
          View All Targets
        </Link>
      </div>
    </div>
  );
}
