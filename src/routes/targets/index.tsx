import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { TerminalHeader } from "../../components/ui/TerminalHeader.tsx";
import { OpenBreachAppFrame } from "../../features/openbreach/app-frame";
import { TargetEmptyState } from "../../features/target-list/target-empty-state.tsx";
import { TargetListCard } from "../../features/target-list/target-list-card.tsx";
import { useTargetList } from "../../hooks/use-target-list.ts";

const targetsSearchSchema = z.object({
  success: z.string().optional(),
});

export const Route = createFileRoute("/targets/")({
  component: TargetsIndexPage,
  validateSearch: targetsSearchSchema,
});

// ============================================================================
// Skeleton loader
// ============================================================================

function TargetListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="relative h-56 animate-pulse overflow-hidden border border-primary/10 bg-surface-container-low p-5 pixel-corner"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-primary/15" />
          <div className="h-4 w-1/3 bg-surface-container-high" />
          <div className="mt-5 h-8 w-2/3 bg-surface-container-high" />
          <div className="mt-3 h-4 w-1/2 bg-surface-container-high" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="h-14 bg-surface" />
            <div className="h-14 bg-surface" />
            <div className="h-14 bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Success banner
// ============================================================================

function CreationSuccessBanner() {
  return (
    <div className="animate-terminal-glow mb-6 border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 p-5 pixel-corner">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-sm text-secondary-fixed-dim">
            ✓ Target created successfully
          </p>
          <p className="mt-1 font-mono text-xs text-on-surface-variant">
            The new target has been registered and is pending workflow
            activation.
          </p>
        </div>
        <Link
          to="/targets/new"
          className="shrink-0 border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 px-4 py-2 font-mono text-[10px] tracking-[0.22em] text-secondary-fixed-dim uppercase transition pixel-corner hover:bg-secondary-fixed-dim/15 focus:ring-2 focus:ring-secondary-fixed-dim/30 focus:outline-none"
        >
          + Create Another
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Page component
// ============================================================================

function TargetsIndexPage() {
  const { targets, isLoading, error } = useTargetList();
  const search = useSearch({ from: "/targets/" });
  const showSuccess = search.success === "created";

  return (
    <OpenBreachAppFrame>
      <section className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="flex flex-col gap-4 border-b border-primary/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <TerminalHeader
            title="target list"
            subtitle="Registered assessment targets and their authorization status."
          />
          <div className="flex items-center gap-3">
            <Link
              to="/guardian"
              className="border border-outline/40 bg-transparent px-4 py-2 font-mono text-[10px] tracking-[0.22em] text-on-surface uppercase transition pixel-corner hover:bg-primary/10 hover:text-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              ← Dashboard
            </Link>
            <Link
              to="/targets/new"
              className="border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-[10px] tracking-[0.22em] text-primary uppercase transition pixel-corner hover:bg-primary/15 focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              + New Target
            </Link>
          </div>
        </header>

        <div className="mt-6 flex-1">
          {showSuccess && <CreationSuccessBanner />}

          {isLoading ? (
            <TargetListSkeleton />
          ) : error ? (
            <div className="border border-error/30 bg-error/10 p-6 text-center pixel-corner">
              <p className="font-mono text-sm text-error">
                Error loading targets: {error.message}
              </p>
            </div>
          ) : targets.length === 0 ? (
            <TargetEmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {targets.map((target) => (
                <TargetListCard key={target.targetId} target={target} />
              ))}
            </div>
          )}
        </div>
      </section>
    </OpenBreachAppFrame>
  );
}
