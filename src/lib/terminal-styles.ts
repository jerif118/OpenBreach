/**
 * Terminal-style design tokens and Tailwind class combinations.
 *
 * These constants centralize the DEFF-ACC terminal aesthetic so primitives
 * stay consistent and refactor-friendly.
 */

// ============================================================================
// Color tokens
// ============================================================================

export const TERMINAL_BG = "bg-surface";
export const TERMINAL_TEXT = "text-on-surface";
export const TERMINAL_TEXT_MUTED = "text-on-surface-variant";

export const ACCENT_PRIMARY = "text-primary";
export const ACCENT_PRIMARY_BG = "bg-primary/10";
export const ACCENT_PRIMARY_BORDER = "border-primary/30";
export const ACCENT_PRIMARY_HOVER = "hover:bg-primary/15";
export const ACCENT_PRIMARY_RING = "focus:ring-primary/30";

export const ACCENT_SECONDARY = "text-on-surface";
export const ACCENT_SECONDARY_BG = "bg-transparent";
export const ACCENT_SECONDARY_BORDER = "border-outline/40";
export const ACCENT_SECONDARY_HOVER = "hover:bg-primary/6 hover:text-primary";

export const ACCENT_DANGER = "text-error";
export const ACCENT_DANGER_BG = "bg-error/10";
export const ACCENT_DANGER_BORDER = "border-error/30";
export const ACCENT_DANGER_HOVER = "hover:bg-error/15";
export const ACCENT_DANGER_RING = "focus:ring-error/30";

export const ERROR_TEXT = "text-error";
export const ERROR_BORDER = "border-error/60";
export const ERROR_RING = "focus:ring-error/30";

// ============================================================================
// Card / container tokens
// ============================================================================

export const CARD_BASE =
  "relative overflow-hidden border border-primary/15 bg-surface-container-low pixel-corner";

export const CARD_SUCCESS =
  "relative overflow-hidden border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 p-6 text-on-surface pixel-corner";

export const CARD_DEMO_BANNER =
  "relative overflow-hidden border border-[#ffd166]/30 bg-[#ffd166]/10 p-4 text-sm text-[#ffd166] pixel-corner";

// ============================================================================
// Input tokens
// ============================================================================

export const INPUT_BASE =
  "w-full border border-primary/20 bg-surface px-4 py-3 font-mono text-sm text-on-surface transition outline-none placeholder:text-on-surface-variant/40 pixel-corner";

export const INPUT_FOCUS =
  "focus:border-primary/50 focus:ring-2 focus:ring-primary/30";

export const INPUT_ERROR =
  "border-error/60 focus:border-error focus:ring-error/30";

// ============================================================================
// Label tokens
// ============================================================================

export const LABEL_BASE =
  "mb-2 block font-mono text-[10px] tracking-[0.22em] text-primary uppercase";

// ============================================================================
// Button tokens
// ============================================================================

export const BUTTON_BASE =
  "border px-5 py-2.5 font-mono text-[10px] tracking-[0.24em] uppercase transition focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45 pixel-corner";

export const BUTTON_PRIMARY = `${BUTTON_BASE} ${ACCENT_PRIMARY_BG} ${ACCENT_PRIMARY_BORDER} ${ACCENT_PRIMARY} ${ACCENT_PRIMARY_HOVER} ${ACCENT_PRIMARY_RING}`;

export const BUTTON_SECONDARY = `${BUTTON_BASE} ${ACCENT_SECONDARY_BG} ${ACCENT_SECONDARY_BORDER} ${ACCENT_SECONDARY} ${ACCENT_SECONDARY_HOVER} ${ACCENT_PRIMARY_RING}`;

export const BUTTON_DANGER = `${BUTTON_BASE} ${ACCENT_DANGER_BG} ${ACCENT_DANGER_BORDER} ${ACCENT_DANGER} ${ACCENT_DANGER_HOVER} ${ACCENT_DANGER_RING}`;

// ============================================================================
// Page background
// ============================================================================

export const PAGE_BACKGROUND = "min-h-screen bg-background text-on-background";

// ============================================================================
// Focus ring (global)
// ============================================================================

export const FOCUS_RING =
  "focus:ring-2 focus:ring-primary/30 focus:outline-none";
