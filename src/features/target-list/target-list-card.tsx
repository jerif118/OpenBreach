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

function riskTierBadgeClasses(riskTier: PipelineTargetRecord["riskTier"]): string {
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
      className="group relative w-full overflow-hidden border border-primary/15 bg-surface-container-low p-5 text-left transition-colors pixel-corner hover:border-primary/35 hover:bg-surface-container hover:shadow-[0_0_24px_rgba(0,219,233,0.08)] focus:ring-2 focus:ring-primary/30 focus:outline-none"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-primary/25 transition group-hover:bg-secondary-fixed-dim/45" />

      <div className="flex items-start justify-between gap-3">
        <code className="font-mono text-[10px] tracking-[0.22em] text-secondary-fixed-dim uppercase sm:text-xs">
          {target.targetId}
        </code>
        <span
          className={`border px-2 py-1 font-mono text-[10px] tracking-[0.18em] uppercase pixel-corner ${riskTierBadgeClasses(target.riskTier)}`}
        >
          {riskTierLabel(target.riskTier)}
        </span>
      </div>

      <h3 className="mt-4 font-display text-2xl text-on-surface">
        {target.name}
      </h3>
      <p className="mt-2 break-all font-mono text-sm text-primary">
        {target.primaryUrl}
      </p>
      <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-on-surface-variant uppercase">
        {formatClassification(target.classification)}
      </p>

      <div className="mt-5 grid gap-3 border-t border-primary/10 pt-4 sm:grid-cols-2">
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

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-primary/10 pt-3">
        <span className="font-mono text-[10px] tracking-[0.2em] text-on-surface-variant uppercase">
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
    <div className={`border border-primary/10 bg-surface px-3 py-3 ${className ?? ""}`.trim()}>
      <p className="font-mono text-[10px] tracking-[0.14em] text-on-surface-variant uppercase">
        {label}
      </p>
      <p className={`mt-2 break-words font-display text-base leading-tight ${tone ? toneClasses(tone) : "text-on-surface"}`}>
        {value}
      </p>
    </div>
  );
}

function formatCardPhase(phase: string | undefined) {
  return phase ? formatWorkflowPhase(phase) : "NO RUN";
}
