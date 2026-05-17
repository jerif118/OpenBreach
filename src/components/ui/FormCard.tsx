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
      <div className="absolute inset-x-0 top-0 h-px bg-primary/35" />
      <div className="relative p-6">
        {title && (
          <h2 className="mb-4 border-b border-primary/10 pb-3 font-display text-xl text-primary uppercase">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
