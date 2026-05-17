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
      <div className="bg-primary/35 absolute inset-x-0 top-0 h-px" />
      <div className="relative p-6">
        {title && (
          <h2 className="border-primary/10 font-display text-primary mb-4 border-b pb-3 text-xl uppercase">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
