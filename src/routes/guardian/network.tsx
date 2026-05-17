import { Link, createFileRoute } from "@tanstack/react-router";

import {
  formatWorkflowPhase,
  formatWorkflowStatus,
} from "../../features/openbreach/pipeline-data";
import {
  EmptyPanel,
  GuardianHeader,
  GuardianPanel,
  SmallMetric,
  ToneBadge,
} from "../../features/openbreach/guardian-ui";
import { useOpenBreachPipeline } from "../../hooks/use-openbreach-pipeline";

export const Route = createFileRoute("/guardian/network")({
  component: NetworkPage,
});

function NetworkPage() {
  const { targets } = useOpenBreachPipeline();
  const totalAllowedAssets = targets.reduce(
    (total, target) => total + target.allowedAssets.length,
    0,
  );
  const totalDeniedAssets = targets.reduce(
    (total, target) => total + target.deniedAssets.length,
    0,
  );
  const activeEvidence = targets.filter((target) => !!target.evidence).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Network Surface"
        subtitle="Authorized assets, scope constraints, and passive collection readiness across the current pipeline."
        action={
          <Link
            className="text-primary font-mono text-[10px] uppercase hover:text-[#00e639]"
            to="/guardian/evidence"
          >
            Open evidence
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Allowed Assets"
          value={totalAllowedAssets.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Denied Assets"
          tone="red"
          value={totalDeniedAssets.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Evidence Sources"
          tone="green"
          value={activeEvidence.toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Asset Coverage Table">
        {targets.length === 0 ? (
          <EmptyPanel message="No targets are available in the current pipeline." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px] lg:text-xs">
              <thead>
                <tr className="border-primary/10 border-b text-[#b9cacb]">
                  <th className="px-2 py-2 font-normal">TARGET</th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    ALLOWED
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    DENIED
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    LEVEL
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    RATE
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    PHASE
                  </th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.targetId} className="hover:bg-primary/5">
                    <td className="px-2 py-3 text-[#00dbe9]">
                      <div className="flex flex-col gap-1">
                        <Link
                          className="hover:text-[#00e639]"
                          to="/targets/$targetId"
                          params={{ targetId: target.targetId }}
                        >
                          {target.name}
                        </Link>
                        <span className="text-[9px] text-[#b9cacb]">
                          {target.primaryUrl}
                        </span>
                      </div>
                    </td>
                    <td className="border-primary/10 border-l px-2 py-3">
                      {target.allowedAssets.length}
                    </td>
                    <td className="border-primary/10 border-l px-2 py-3">
                      {target.deniedAssets.length}
                    </td>
                    <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
                      {target.validationLevel
                        .replaceAll("_", " ")
                        .toUpperCase()}
                    </td>
                    <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
                      {target.rateLimit} rpm
                    </td>
                    <td className="border-primary/10 border-l px-2 py-3">
                      <ToneBadge
                        label={formatWorkflowPhase(
                          target.latestRun?.currentPhase,
                        )}
                        tone={
                          target.approvalStatus === "rejected"
                            ? "red"
                            : target.evidence
                              ? "green"
                              : "cyan"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GuardianPanel>

      <GuardianPanel title="Scope Guardrails">
        <div className="grid gap-4 lg:grid-cols-3">
          {targets.map((target) => (
            <div
              key={target.targetId}
              className="border-primary/10 border bg-[#131313]/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] text-[#00dbe9] uppercase">
                  {target.targetId}
                </p>
                <ToneBadge
                  label={formatWorkflowStatus(target.latestRun?.status)}
                  tone={
                    target.approvalStatus === "rejected"
                      ? "red"
                      : target.evidence
                        ? "green"
                        : "amber"
                  }
                />
              </div>
              <p className="mt-3 font-mono text-[10px] leading-5 text-[#b9cacb]">
                {target.summary}
              </p>
              <div className="bg-primary/10 mt-4 h-1">
                <div
                  className="h-full bg-[linear-gradient(90deg,_rgba(0,230,57,0.95),_rgba(0,219,233,0.55))]"
                  style={{ width: `${target.coverage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GuardianPanel>
    </div>
  );
}
