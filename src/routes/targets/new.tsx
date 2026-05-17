import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { TerminalHeader } from "~/components/ui/TerminalHeader.tsx";
import { TargetIntakeForm } from "~/features/target-intake/target-intake-form.tsx";
import { TargetSuccessCard } from "~/features/target-intake/target-success-card.tsx";
import type { TargetCreateResult } from "~/hooks/use-target-create.ts";

export const Route = createFileRoute("/targets/new")({
  component: TargetsNewPage,
});

// ============================================================================
// Page component
// ============================================================================

function TargetsNewPage() {
  const [createdTarget, setCreatedTarget] = useState<TargetCreateResult | null>(
    null,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_34rem),linear-gradient(135deg,_#020617_0%,_#0f172a_52%,_#111827_100%)] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <TerminalHeader
            title="target new"
            subtitle="Register a new assessment target and initialize intake workflow."
          />
          <div className="flex items-center gap-3">
            <Link
              to="/targets"
              className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white focus:ring-2 focus:ring-cyan-200/40 focus:outline-none"
            >
              ← Back to list
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="mt-6 flex-1">
          {createdTarget ? (
            <TargetSuccessCard target={createdTarget} />
          ) : (
            <div className="mx-auto max-w-3xl">
              <TargetIntakeForm onSuccess={setCreatedTarget} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
