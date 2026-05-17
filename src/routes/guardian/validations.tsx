import { Link, createFileRoute } from "@tanstack/react-router";

import {
  formatTimestamp,
  formatWorkflowPhase,
  formatWorkflowStatus,
  getWorkflowTone,
} from "../../features/openbreach/pipeline-data";
import {
  EmptyPanel,
  GuardianHeader,
  GuardianPanel,
  SmallMetric,
  ToneBadge,
} from "../../features/openbreach/guardian-ui";
import { useOpenBreachPipeline } from "../../hooks/use-openbreach-pipeline";

export const Route = createFileRoute("/guardian/validations")({
  component: SecurityValidations,
});

function SecurityValidations() {
  const { recentValidations, targets } = useOpenBreachPipeline();
  const approvedPlans = targets.filter((target) => !!target.testPlan).length;
  const completedValidations = targets.filter((target) => !!target.validation).length;
  const blockedTargets = targets.filter(
    (target) => target.approvalStatus === "rejected",
  ).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Validation Queue"
        subtitle="Approval gates, workflow phases, and controlled validation outputs for every target in scope."
        action={
          <Link
            className="font-mono text-[10px] text-primary uppercase hover:text-[#00e639]"
            to="/guardian/reports"
          >
            Open reports
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Approved Plans"
          value={approvedPlans.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Completed Validations"
          tone="green"
          value={completedValidations.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Blocked Targets"
          tone="red"
          value={blockedTargets.toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Workflow Validation Matrix">
        {targets.length === 0 ? (
          <EmptyPanel message="No targets are available for validation review." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px] lg:text-xs">
              <thead>
                <tr className="border-b border-primary/10 text-[#b9cacb]">
                  <th className="px-2 py-2 font-normal">TARGET</th>
                  <th className="border-l border-primary/10 px-2 py-2 font-normal">
                    PLAN
                  </th>
                  <th className="border-l border-primary/10 px-2 py-2 font-normal">
                    PHASE
                  </th>
                  <th className="border-l border-primary/10 px-2 py-2 font-normal">
                    RESULT
                  </th>
                  <th className="border-l border-primary/10 px-2 py-2 font-normal">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.targetId} className="hover:bg-primary/5">
                    <td className="px-2 py-3 text-[#00dbe9]">{target.name}</td>
                    <td className="border-l border-primary/10 px-2 py-3 text-[#b9cacb]">
                      {target.testPlan?.status?.toUpperCase() ?? "MISSING"}
                    </td>
                    <td className="border-l border-primary/10 px-2 py-3 text-[#b9cacb]">
                      {formatWorkflowPhase(target.latestRun?.currentPhase)}
                    </td>
                    <td className="border-l border-primary/10 px-2 py-3">
                      <ToneBadge
                        label={
                          target.validation
                            ? target.validation.status.toUpperCase()
                            : formatWorkflowStatus(target.latestRun?.status)
                        }
                        tone={
                          target.validation
                            ? target.validation.status === "passed"
                              ? "green"
                              : "red"
                            : getWorkflowTone(target.latestRun?.status)
                        }
                      />
                    </td>
                    <td className="border-l border-primary/10 px-2 py-3">
                      <Link
                        className="text-primary hover:text-[#00e639]"
                        to="/targets/$targetId"
                        params={{ targetId: target.targetId }}
                      >
                        Open target
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GuardianPanel>

      <GuardianPanel title="Recent Validation Activity">
        {recentValidations.length === 0 ? (
          <EmptyPanel message="No validation events have been recorded yet." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {targets
              .filter((target) => !!target.validation || !!target.testPlan)
              .map((target) => (
                <div
                  key={target.targetId}
                  className="border border-primary/10 bg-[#131313]/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00dbe9]">
                        {target.name}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-[#b9cacb]">
                        {target.testPlan?.title ?? "No validation plan"}
                      </p>
                    </div>
                    <ToneBadge
                      label={
                        target.validation
                          ? target.validation.status.toUpperCase()
                          : target.approvalStatus.toUpperCase()
                      }
                      tone={
                        target.validation
                          ? target.validation.status === "passed"
                            ? "green"
                            : "red"
                          : target.approvalStatus === "approved"
                            ? "amber"
                            : "red"
                      }
                    />
                  </div>
                  <p className="mt-4 font-mono text-[10px] leading-5 text-[#b9cacb]">
                    {target.validation?.summary ?? target.summary}
                  </p>
                  <p className="mt-3 font-mono text-[10px] text-primary/60">
                    {formatTimestamp(
                      target.validation?.executedAt ??
                        target.testPlan?.approvedAt ??
                        target.latestRun?.startedAt,
                    )}
                  </p>
                </div>
              ))}
          </div>
        )}
      </GuardianPanel>
    </div>
  );
}
