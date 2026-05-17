import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  BUTTON_DANGER,
} from "~/lib/terminal-styles";

// ============================================================================
// Types
// ============================================================================

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant: ButtonVariant;
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
}

// ============================================================================
// Variant map
// ============================================================================

const variantClasses: Record<ButtonVariant, string> = {
  primary: BUTTON_PRIMARY,
  secondary: BUTTON_SECONDARY,
  danger: BUTTON_DANGER,
};

// ============================================================================
// Component
// ============================================================================

export function Button({
  variant,
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const baseClass = variantClasses[variant];
  const mergedClass = `${baseClass} ${className}`.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={mergedClass}
      {...rest}
    >
      {children}
    </button>
  );
}
