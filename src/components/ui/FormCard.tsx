import type { ReactNode } from "react";
import { CARD_BASE } from "~/lib/terminal-styles";

// ============================================================================
// Types
// ============================================================================

export interface FormCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FormCard({ children, title, className = "" }: FormCardProps) {
  return (
    <div className={`${CARD_BASE} ${className}`.trim()}>
      {/* Optional corner accent */}
      <div className="absolute top-0 left-0 h-1 w-full rounded-t-[2rem] bg-cyan-300/30" />
      <div className="relative p-6">
        {title && (
          <h2 className="mb-4 border-b border-slate-700 pb-2 font-mono text-lg font-semibold text-white">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
