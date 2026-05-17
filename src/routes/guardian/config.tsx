import { Link, createFileRoute } from "@tanstack/react-router";

import {
  formatClassification,
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

export const Route = createFileRoute("/guardian/config")({
  component: PlatformConfiguration,
});

function PlatformConfiguration() {
  const { targets } = useOpenBreachPipeline();
  const passiveOnly = targets.filter(
    (target) => target.validationLevel === "passive",
  ).length;
  const controlled = targets.filter(
    (target) => target.validationLevel === "controlled_validation",
  ).length;
  const rejected = targets.filter(
    (target) => target.approvalStatus === "rejected",
  ).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Pipeline Guardrails"
        subtitle="Scope, validation level, and rate-limit rules that keep the workflow aligned with the authorized defensive boundary."
        action={
          <Link
            className="text-primary font-mono text-[10px] uppercase hover:text-[#00e639]"
            to="/targets/new"
          >
            Register target
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Passive Only"
          value={passiveOnly.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Controlled Validation"
          tone="green"
          value={controlled.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Rejected At Intake"
          tone="red"
          value={rejected.toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Configured Target Policies">
        {targets.length === 0 ? (
          <EmptyPanel message="No target policies are available in the current snapshot." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px] lg:text-xs">
              <thead>
                <tr className="border-primary/10 border-b text-[#b9cacb]">
                  <th className="px-2 py-2 font-normal">TARGET</th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    CLASS
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    LEVEL
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    RATE
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.targetId} className="hover:bg-primary/5">
                    <td className="px-2 py-3 text-[#00dbe9]">{target.name}</td>
                    <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
                      {formatClassification(target.classification)}
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
                        label={formatWorkflowStatus(target.latestRun?.status)}
                        tone={
                          target.approvalStatus === "rejected"
                            ? "red"
                            : target.validationLevel === "controlled_validation"
                              ? "green"
                              : "amber"
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
    </div>
  );
}
