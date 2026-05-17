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
      {/* ASCII checkmark */}
      <div className="mb-4 font-mono text-emerald-300">
        <pre className="text-xs leading-4">
          {`    ____
   /    \\  TARGET CREATED
  |  ✓✓  |
   \\____/`}
        </pre>
      </div>

      <h2 className="mb-2 font-mono text-lg font-semibold text-white">
        Target intake completed
      </h2>

      <p className="mb-4 font-mono text-sm text-emerald-100/80">
        The target has been registered and auto-approved for the MVP workflow.
      </p>

      {/* Summary table */}
      <div className="mb-6 rounded-2xl border border-emerald-300/10 bg-emerald-300/5 p-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Target ID</dt>
            <dd className="font-mono text-white">{target.targetId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Name</dt>
            <dd className="font-mono text-white">{target.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Risk Tier</dt>
            <dd className="font-mono text-white capitalize">{target.riskTier}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Classification</dt>
            <dd className="font-mono text-white">{target.classification}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Run ID</dt>
            <dd className="font-mono text-xs text-white">{target.runId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Status</dt>
            <dd className="font-mono text-white">{target.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono text-emerald-200/70">Phase</dt>
            <dd className="font-mono text-white">{target.currentPhase}</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/targets"
          className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20 focus:ring-2 focus:ring-emerald-200/40 focus:outline-none"
        >
          ← Back to Target List
        </Link>
        <Link
          to="/targets"
          search={{ success: "created" }}
          className="rounded-full border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white focus:ring-2 focus:ring-cyan-200/40 focus:outline-none"
        >
          View All Targets
        </Link>
      </div>
    </div>
  );
}
