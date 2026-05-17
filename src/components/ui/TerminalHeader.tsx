import type { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

export interface TerminalHeaderProps {
  title: string;
  subtitle?: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function TerminalHeader({ title, subtitle }: TerminalHeaderProps) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 font-mono text-sm">
        <span className="text-cyan-400">user@deff-acc</span>
        <span className="text-slate-500">:</span>
        <span className="text-slate-300">~</span>
        <span className="text-slate-500">$</span>
        <span className="text-green-400">{title}</span>
      </div>
      {subtitle && (
        <p className="mt-1 font-mono text-sm text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
