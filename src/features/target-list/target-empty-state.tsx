import { Link } from "@tanstack/react-router";

// ============================================================================
// Component
// ============================================================================

export function TargetEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
      {/* Terminal prompt style */}
      <div className="mb-4 font-mono text-sm">
        <span className="text-cyan-400">user@deff-acc</span>
        <span className="text-slate-500">:</span>
        <span className="text-slate-300">~</span>
        <span className="text-slate-500">$</span>
        <span className="ml-1 text-green-400">target list</span>
      </div>

      {/* ASCII art separator */}
      <pre className="mb-6 font-mono text-xs leading-5 text-slate-500">
        {"+--------------------------------+"}
        <br />
        {"|  No targets in system          |"}
        <br />
        {"+--------------------------------+"}
      </pre>

      <p className="max-w-md font-mono text-sm text-slate-300">
        No targets found. Create one with{" "}
        <code className="rounded bg-slate-950 px-1.5 py-0.5 text-green-400">
          target new
        </code>
      </p>

      <div className="mt-6">
        <Link
          to="/targets/new"
          className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 focus:ring-2 focus:ring-cyan-200/40 focus:outline-none"
        >
          New Target
        </Link>
      </div>
    </div>
  );
}
