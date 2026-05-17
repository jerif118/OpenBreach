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
        <span className="text-primary">user@deff-acc</span>
        <span className="text-on-surface-variant">:</span>
        <span className="text-on-surface-variant">~</span>
        <span className="text-on-surface-variant">$</span>
        <span className="text-secondary-fixed-dim">{title}</span>
      </div>
      {subtitle && (
        <p className="text-on-surface-variant mt-1 font-mono text-sm">
          {subtitle}
        </p>
      )}
    </div>
  );
}
