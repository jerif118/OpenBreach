import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { TerminalHeader } from "~/components/ui/TerminalHeader.tsx";
import { OpenBreachAppFrame } from "~/features/openbreach/app-frame";
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
    <OpenBreachAppFrame>
      <section className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="border-primary/20 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <TerminalHeader
            title="target new"
            subtitle="Register a new assessment target and initialize intake workflow."
          />
          <div className="flex items-center gap-3">
            <Link
              to="/targets"
              className="border-outline/40 text-on-surface pixel-corner hover:bg-primary/10 hover:text-primary focus:ring-primary/30 border bg-transparent px-4 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition focus:ring-2 focus:outline-none"
            >
              ← Back to list
            </Link>
          </div>
        </header>

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
    </OpenBreachAppFrame>
  );
}
