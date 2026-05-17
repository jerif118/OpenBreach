import { Link, createFileRoute } from "@tanstack/react-router";

import {
  formatTimestamp,
  getFindingTone,
} from "../../features/openbreach/pipeline-data";
import {
  EmptyPanel,
  GuardianHeader,
  GuardianPanel,
  SmallMetric,
  ToneBadge,
} from "../../features/openbreach/guardian-ui";
import { useOpenBreachPipeline } from "../../hooks/use-openbreach-pipeline";

export const Route = createFileRoute("/guardian/threats")({
  component: ThreatsPage,
});

function ThreatsPage() {
  const { findings, targets } = useOpenBreachPipeline();
  const criticalOrHigh = findings.filter(
    (finding) =>
      finding.severity === "critical" || finding.severity === "high",
  ).length;
  const hypotheses = targets.filter((target) => !!target.hypothesis);
  const reportReady = findings.filter((finding) => finding.reportReady).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Threat Review"
        subtitle="Evidence-backed hypotheses and reportable findings produced by the approved validation pipeline."
        action={
          <Link
            className="font-mono text-[10px] text-primary uppercase hover:text-[#00e639]"
            to="/guardian/validations"
          >
            Review validations
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Critical Or High"
          tone="red"
          value={criticalOrHigh.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Active Hypotheses"
          value={hypotheses.length.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Report Ready"
          tone="green"
          value={reportReady.toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Confirmed And Observed Findings">
        {findings.length === 0 ? (
          <EmptyPanel message="No findings are available in the current pipeline snapshot." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {findings.map((finding) => (
              <div
                key={finding.findingId}
                className="border border-primary/10 bg-[#131313]/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b9cacb]">
                      {finding.targetName}
                    </p>
                    <h3 className="mt-2 font-display text-base text-primary uppercase">
                      {finding.title}
                    </h3>
                  </div>
                  <ToneBadge
                    label={finding.severity.toUpperCase()}
                    tone={getFindingTone(finding.severity)}
                  />
                </div>
                <p className="mt-3 font-mono text-[10px] leading-5 text-[#b9cacb]">
                  {finding.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] text-primary/60">
                    {formatTimestamp(finding.createdAt)}
                  </p>
                  <Link
                    className="font-mono text-[10px] text-primary hover:text-[#00e639]"
                    to="/targets/$targetId"
                    params={{ targetId: finding.targetId }}
                  >
                    Open target
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GuardianPanel>

      <GuardianPanel title="Hypothesis Queue">
        {hypotheses.length === 0 ? (
          <EmptyPanel message="No evidence-backed hypotheses are currently registered." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {hypotheses.map((target) => (
              <div
                key={target.targetId}
                className="border border-primary/10 bg-[#131313]/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00dbe9]">
                    {target.name}
                  </p>
                  <ToneBadge
                    label={target.hypothesis?.status.toUpperCase() ?? "PENDING"}
                    tone={target.validation ? "green" : "amber"}
                  />
                </div>
                <h3 className="mt-3 font-display text-base text-primary uppercase">
                  {target.hypothesis?.title ?? "No hypothesis attached"}
                </h3>
                <p className="mt-2 font-mono text-[10px] leading-5 text-[#b9cacb]">
                  {target.hypothesis?.description ?? target.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </GuardianPanel>
    </div>
  );
}
