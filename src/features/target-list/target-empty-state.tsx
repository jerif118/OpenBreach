import { Link } from "@tanstack/react-router";

// ============================================================================
// Component
// ============================================================================

export function TargetEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center border border-primary/15 bg-surface-container-low p-10 text-center pixel-corner">
      <div className="mb-4 font-mono text-sm">
        <span className="text-primary">user@deff-acc</span>
        <span className="text-on-surface-variant">:</span>
        <span className="text-on-surface-variant">~</span>
        <span className="text-on-surface-variant">$</span>
        <span className="ml-1 text-secondary-fixed-dim">target list</span>
      </div>

      <pre className="mb-6 border border-primary/10 bg-surface px-5 py-4 font-mono text-xs leading-5 text-on-surface-variant pixel-corner">
        {"+--------------------------------+"}
        <br />
        {"|  No targets in system          |"}
        <br />
        {"+--------------------------------+"}
      </pre>

      <p className="max-w-md font-mono text-sm text-on-surface-variant">
        No targets found. Create one with{" "}
        <code className="border border-primary/20 bg-surface px-1.5 py-0.5 text-secondary-fixed-dim">
          target new
        </code>
      </p>

      <div className="mt-6">
        <Link
          to="/targets/new"
          className="inline-flex border border-primary/30 bg-primary/10 px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] text-primary uppercase transition pixel-corner hover:bg-primary/15 focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          New Target
        </Link>
      </div>
    </div>
  );
}
