import type { TargetListItemDto } from "../../../convex/types.js";

// ============================================================================
// Types
// ============================================================================

export interface TargetListCardProps {
  target: TargetListItemDto;
  onClick?: (target: TargetListItemDto) => void;
}

// ============================================================================
// Risk tier styling
// ============================================================================

function riskTierBadgeClasses(
  riskTier: TargetListItemDto["riskTier"],
): string {
  switch (riskTier) {
    case "low":
      return "border-green-400/30 bg-green-400/10 text-green-300";
    case "medium":
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    case "high":
      return "border-orange-400/30 bg-orange-400/10 text-orange-300";
    case "critical":
      return "border-red-400/30 bg-red-400/10 text-red-300";
    default:
      return "border-slate-400/30 bg-slate-400/10 text-slate-300";
  }
}

function riskTierLabel(riskTier: TargetListItemDto["riskTier"]): string {
  return riskTier.charAt(0).toUpperCase() + riskTier.slice(1);
}

// ============================================================================
// Component
// ============================================================================

export function TargetListCard({ target, onClick }: TargetListCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(target);
    } else {
      // eslint-disable-next-line no-console
      console.log("[TargetListCard] clicked:", target.targetId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative w-full rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 text-left shadow-lg shadow-black/20 backdrop-blur transition hover:border-green-400/50 hover:shadow-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-400/40"
    >
      {/* Top accent line */}
      <div className="absolute left-0 top-0 h-1 w-full rounded-t-[2rem] bg-cyan-300/20 transition group-hover:bg-green-400/40" />

      <div className="relative">
        {/* Header: targetId + badge */}
        <div className="flex items-start justify-between gap-3">
          <code className="font-mono text-sm text-green-400">
            {target.targetId}
          </code>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${riskTierBadgeClasses(target.riskTier)}`}
          >
            {riskTierLabel(target.riskTier)}
          </span>
        </div>

        {/* Name */}
        <h3 className="mt-3 text-lg font-semibold text-white">
          {target.name}
        </h3>

        {/* URL */}
        <p className="mt-1 truncate font-mono text-sm text-cyan-400">
          {target.primaryUrl}
        </p>

        {/* Classification */}
        <p className="mt-3 text-xs font-medium tracking-wider text-slate-400 uppercase">
          {target.classification.replace("-", " ")}
        </p>
      </div>
    </button>
  );
}
