import { useNavigate } from "@tanstack/react-router";

import type { PipelineTargetRecord } from "../openbreach/pipeline-data";
import {
  formatClassification,
  formatWorkflowPhase,
  formatWorkflowStatus,
} from "../openbreach/pipeline-data";
import {
  getTargetLastUpdated,
  getTargetStatusTone,
} from "../../hooks/use-openbreach-pipeline";

export interface TargetListCardProps {
  target: PipelineTargetRecord;
  onClick?: (target: PipelineTargetRecord) => void;
}

function riskTierBadgeClasses(
  riskTier: PipelineTargetRecord["riskTier"],
): string {
  switch (riskTier) {
    case "low":
      return "border-primary/30 bg-primary/10 text-primary";
    case "medium":
      return "border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffd166]";
    case "high":
      return "border-[#ffb37a]/30 bg-[#ffb37a]/10 text-[#ffb37a]";
    case "critical":
      return "border-error/30 bg-error/10 text-error";
    default:
      return "border-outline/40 bg-surface text-on-surface-variant";
  }
}

function toneClasses(tone: "cyan" | "green" | "red" | "amber") {
  if (tone === "green") {
    return "text-secondary-fixed-dim";
  }

  if (tone === "red") {
    return "text-error";
  }

  if (tone === "amber") {
    return "text-[#ffd166]";
  }

  return "text-primary";
}

function riskTierLabel(riskTier: PipelineTargetRecord["riskTier"]): string {
  return riskTier.charAt(0).toUpperCase() + riskTier.slice(1);
}

export function TargetListCard({ target, onClick }: TargetListCardProps) {
  const navigate = useNavigate();
  const statusTone = getTargetStatusTone(target);

  const handleClick = () => {
    if (onClick) {
      onClick(target);
      return;
    }

    navigate({
      to: "/targets/$targetId",
      params: { targetId: target.targetId },
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group border-primary/15 bg-surface-container-low pixel-corner hover:border-primary/35 hover:bg-surface-container focus:ring-primary/30 relative w-full overflow-hidden border p-5 text-left transition-colors hover:shadow-[0_0_24px_rgba(0,219,233,0.08)] focus:ring-2 focus:outline-none"
    >
      <div className="bg-primary/25 group-hover:bg-secondary-fixed-dim/45 absolute inset-x-0 top-0 h-px transition" />

      <div className="flex items-start justify-between gap-3">
        <code className="text-secondary-fixed-dim font-mono text-[10px] tracking-[0.22em] uppercase sm:text-xs">
          {target.targetId}
        </code>
        <span
          className={`pixel-corner border px-2 py-1 font-mono text-[10px] tracking-[0.18em] uppercase ${riskTierBadgeClasses(target.riskTier)}`}
        >
          {riskTierLabel(target.riskTier)}
        </span>
      </div>

      <h3 className="font-display text-on-surface mt-4 text-2xl">
        {target.name}
      </h3>
      <p className="text-primary mt-2 font-mono text-sm break-all">
        {target.primaryUrl}
      </p>
      <p className="text-on-surface-variant mt-3 font-mono text-[10px] tracking-[0.2em] uppercase">
        {formatClassification(target.classification)}
      </p>

      <div className="border-primary/10 mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2">
        <CardFact
          label="Phase"
          value={formatCardPhase(target.latestRun?.currentPhase)}
        />
        <CardFact
          label="Status"
          tone={statusTone}
          value={formatWorkflowStatus(target.latestRun?.status)}
        />
        <CardFact
          className="sm:col-span-2"
          label="Updated"
          value={getTargetLastUpdated(target)}
        />
      </div>

      <div className="border-primary/10 mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-on-surface-variant font-mono text-[10px] tracking-[0.2em] uppercase">
          Next: {target.nextActionLabel}
        </span>
        <span
          className={`font-mono text-[10px] tracking-[0.22em] uppercase transition ${toneClasses(statusTone)}`}
        >
          OPEN_DETAIL
        </span>
      </div>
    </button>
  );
}

function CardFact({
  className,
  label,
  value,
  tone,
}: {
  className?: string;
  label: string;
  value: string;
  tone?: "cyan" | "green" | "red" | "amber";
}) {
  return (
    <div
      className={`border-primary/10 bg-surface border px-3 py-3 ${className ?? ""}`.trim()}
    >
      <p className="text-on-surface-variant font-mono text-[10px] tracking-[0.14em] uppercase">
        {label}
      </p>
      <p
        className={`font-display mt-2 text-base leading-tight break-words ${tone ? toneClasses(tone) : "text-on-surface"}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatCardPhase(phase: string | undefined) {
  return phase ? formatWorkflowPhase(phase) : "NO RUN";
}
