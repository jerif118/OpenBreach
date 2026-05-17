import { Link } from "@tanstack/react-router";

// ============================================================================
// Component
// ============================================================================

export function TargetEmptyState() {
  return (
    <div className="border-primary/15 bg-surface-container-low pixel-corner flex flex-col items-center justify-center border p-10 text-center">
      <div className="mb-4 font-mono text-sm">
        <span className="text-primary">user@deff-acc</span>
        <span className="text-on-surface-variant">:</span>
        <span className="text-on-surface-variant">~</span>
        <span className="text-on-surface-variant">$</span>
        <span className="text-secondary-fixed-dim ml-1">target list</span>
      </div>

      <pre className="border-primary/10 bg-surface text-on-surface-variant pixel-corner mb-6 border px-5 py-4 font-mono text-xs leading-5">
        {"+--------------------------------+"}
        <br />
        {"|  No targets in system          |"}
        <br />
        {"+--------------------------------+"}
      </pre>

      <p className="text-on-surface-variant max-w-md font-mono text-sm">
        No targets found. Create one with{" "}
        <code className="border-primary/20 bg-surface text-secondary-fixed-dim border px-1.5 py-0.5">
          target new
        </code>
      </p>

      <div className="mt-6">
        <Link
          to="/targets/new"
          className="border-primary/30 bg-primary/10 text-primary pixel-corner hover:bg-primary/15 focus:ring-primary/30 inline-flex border px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none"
        >
          New Target
        </Link>
      </div>
    </div>
  );
}
