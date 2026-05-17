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
      <div className="mb-4 font-mono text-secondary-fixed-dim">
        <pre className="text-xs leading-4">
          {`    ____
   /    \\  TARGET CREATED
  |  ✓✓  |
   \\____/`}
        </pre>
      </div>

      <h2 className="mb-2 font-display text-2xl text-on-surface uppercase">
        Target intake completed
      </h2>

      <p className="mb-4 font-mono text-sm text-on-surface-variant">
        The target has been registered and auto-approved for the MVP workflow.
      </p>

      <div className="mb-6 border border-secondary-fixed-dim/20 bg-surface px-4 py-4 pixel-corner">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Target ID</dt>
            <dd className="font-mono text-on-surface">{target.targetId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Name</dt>
            <dd className="font-mono text-on-surface">{target.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Risk Tier</dt>
            <dd className="font-mono text-on-surface capitalize">
              {target.riskTier}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Classification</dt>
            <dd className="font-mono text-on-surface">{target.classification}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Run ID</dt>
            <dd className="font-mono text-xs text-on-surface">{target.runId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Status</dt>
            <dd className="font-mono text-on-surface">{target.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-on-surface-variant">Phase</dt>
            <dd className="font-mono text-on-surface">{target.currentPhase}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/targets/$targetId"
          params={{ targetId: target.targetId }}
          className="border border-primary/30 bg-primary/10 px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] text-primary uppercase transition pixel-corner hover:bg-primary/15 focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          Open Target Detail
        </Link>
        <Link
          to="/targets"
          className="border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] text-secondary-fixed-dim uppercase transition pixel-corner hover:bg-secondary-fixed-dim/15 focus:ring-2 focus:ring-secondary-fixed-dim/30 focus:outline-none"
        >
          ← Back to Target List
        </Link>
        <Link
          to="/targets"
          search={{ success: "created" }}
          className="border border-outline/40 bg-transparent px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] text-on-surface uppercase transition pixel-corner hover:bg-primary/10 hover:text-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          View All Targets
        </Link>
      </div>
    </div>
  );
}
