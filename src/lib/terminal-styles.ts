/**
 * Terminal-style design tokens and Tailwind class combinations.
 *
 * These constants centralize the DEFF-ACC terminal aesthetic so primitives
 * stay consistent and refactor-friendly.
 */

// ============================================================================
// Color tokens
// ============================================================================

export const TERMINAL_BG = "bg-slate-950";
export const TERMINAL_TEXT = "text-slate-100";
export const TERMINAL_TEXT_MUTED = "text-slate-300";

export const ACCENT_PRIMARY = "text-cyan-300";
export const ACCENT_PRIMARY_BG = "bg-cyan-300/10";
export const ACCENT_PRIMARY_BORDER = "border-cyan-300/30";
export const ACCENT_PRIMARY_HOVER = "hover:bg-cyan-300/20";
export const ACCENT_PRIMARY_RING = "focus:ring-cyan-200/40";

export const ACCENT_SECONDARY = "text-slate-300";
export const ACCENT_SECONDARY_BG = "bg-transparent";
export const ACCENT_SECONDARY_BORDER = "border-white/10";
export const ACCENT_SECONDARY_HOVER = "hover:bg-white/5 hover:text-white";

export const ACCENT_DANGER = "text-red-200";
export const ACCENT_DANGER_BG = "bg-red-400/10";
export const ACCENT_DANGER_BORDER = "border-red-400/30";
export const ACCENT_DANGER_HOVER = "hover:bg-red-400/20";
export const ACCENT_DANGER_RING = "focus:ring-red-300";

export const ERROR_TEXT = "text-red-300";
export const ERROR_BORDER = "border-red-400/50";
export const ERROR_RING = "focus:ring-red-300/30";

// ============================================================================
// Card / container tokens
// ============================================================================

export const CARD_BASE =
  "rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/30 backdrop-blur";

export const CARD_SUCCESS =
  "rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6 text-emerald-50";

export const CARD_DEMO_BANNER =
  "rounded-2xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm text-amber-100";

// ============================================================================
// Input tokens
// ============================================================================

export const INPUT_BASE =
  "w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white font-mono transition outline-none placeholder:text-slate-500";

export const INPUT_FOCUS =
  "focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/40";

export const INPUT_ERROR =
  "border-red-400/50 focus:border-red-300 focus:ring-red-300/30";

// ============================================================================
// Label tokens
// ============================================================================

export const LABEL_BASE =
  "block text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase mb-2";

// ============================================================================
// Button tokens
// ============================================================================

export const BUTTON_BASE =
  "rounded-full px-5 py-2.5 text-sm font-semibold transition focus:ring-2 focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed";

export const BUTTON_PRIMARY = `${BUTTON_BASE} ${ACCENT_PRIMARY_BG} ${ACCENT_PRIMARY_BORDER} ${ACCENT_PRIMARY} ${ACCENT_PRIMARY_HOVER} ${ACCENT_PRIMARY_RING}`;

export const BUTTON_SECONDARY = `${BUTTON_BASE} ${ACCENT_SECONDARY_BG} ${ACCENT_SECONDARY_BORDER} ${ACCENT_SECONDARY} ${ACCENT_SECONDARY_HOVER} ${ACCENT_PRIMARY_RING}`;

export const BUTTON_DANGER = `${BUTTON_BASE} ${ACCENT_DANGER_BG} ${ACCENT_DANGER_BORDER} ${ACCENT_DANGER} ${ACCENT_DANGER_HOVER} ${ACCENT_DANGER_RING}`;

// ============================================================================
// Page background
// ============================================================================

export const PAGE_BACKGROUND =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_34rem),linear-gradient(135deg,_#020617_0%,_#0f172a_52%,_#111827_100%)] text-slate-100";

// ============================================================================
// Focus ring (global)
// ============================================================================

export const FOCUS_RING = "focus:ring-2 focus:ring-cyan-200/40 focus:outline-none";
