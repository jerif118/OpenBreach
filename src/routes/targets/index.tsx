import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { TerminalHeader } from "../../components/ui/TerminalHeader.tsx";
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
          className="relative h-40 animate-pulse rounded-[2rem] border border-white/5 bg-slate-900/60 p-5 backdrop-blur"
        >
          <div className="absolute top-0 left-0 h-1 w-full rounded-t-[2rem] bg-slate-700/50" />
          <div className="h-4 w-1/3 rounded bg-slate-700/50" />
          <div className="mt-4 h-5 w-2/3 rounded bg-slate-700/50" />
          <div className="mt-2 h-4 w-1/2 rounded bg-slate-700/50" />
          <div className="mt-4 h-3 w-1/4 rounded bg-slate-700/50" />
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
    <div className="animate-terminal-glow mb-6 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold text-emerald-100">
            ✓ Target created successfully
          </p>
          <p className="mt-1 font-mono text-xs text-emerald-100/70">
            The new target has been registered and is pending workflow
            activation.
          </p>
        </div>
        <Link
          to="/targets/new"
          className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20 focus:ring-2 focus:ring-emerald-200/40 focus:outline-none"
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_34rem),linear-gradient(135deg,_#020617_0%,_#0f172a_52%,_#111827_100%)] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <TerminalHeader
            title="target list"
            subtitle="Registered assessment targets and their authorization status."
          />
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white focus:ring-2 focus:ring-cyan-200/40 focus:outline-none"
            >
              ← Dashboard
            </Link>
            <Link
              to="/targets/new"
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 focus:ring-2 focus:ring-cyan-200/40 focus:outline-none"
            >
              + New Target
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="mt-6 flex-1">
          {showSuccess && <CreationSuccessBanner />}

          {isLoading ? (
            <TargetListSkeleton />
          ) : error ? (
            <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6 text-center">
              <p className="font-mono text-sm text-red-300">
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
    </main>
  );
}
