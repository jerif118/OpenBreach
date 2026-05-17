import { Link, createFileRoute } from "@tanstack/react-router";

import { formatTimestamp } from "../../features/openbreach/pipeline-data";
import {
  EmptyPanel,
  GuardianHeader,
  GuardianPanel,
  SmallMetric,
  ToneBadge,
} from "../../features/openbreach/guardian-ui";
import { useOpenBreachPipeline } from "../../hooks/use-openbreach-pipeline";

export const Route = createFileRoute("/guardian/reports")({
  component: SecurityReports,
});

function SecurityReports() {
  const { reportDownloads, targets } = useOpenBreachPipeline();
  const readyTargets = targets.filter(
    (target) => target.reportArtifact?.status === "completed",
  );
  const technicalReports = reportDownloads.filter(
    (download) => download.variant === "technical",
  ).length;
  const friendlyReports = reportDownloads.filter(
    (download) => download.variant === "friendly",
  ).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Report Delivery"
        subtitle="Report readiness, artifact status, and downloadable technical or friendly PDFs mapped to the pipeline."
        action={
          <Link
            className="font-mono text-[10px] text-primary uppercase hover:text-[#00e639]"
            to="/guardian/validations"
          >
            Validation queue
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Ready Targets"
          tone="green"
          value={readyTargets.length.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Technical PDFs"
          value={technicalReports.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Friendly PDFs"
          value={friendlyReports.toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Target Report Status">
        {targets.length === 0 ? (
          <EmptyPanel message="No targets are available in the report pipeline." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {targets.map((target) => (
              <div
                key={target.targetId}
                className="border border-primary/10 bg-[#131313]/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00dbe9]">
                      {target.name}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-[#b9cacb]">
                      {target.summary}
                    </p>
                  </div>
                  <ToneBadge
                    label={
                      target.reportArtifact?.status?.toUpperCase() ??
                      "NOT_READY"
                    }
                    tone={
                      target.reportArtifact?.status === "completed"
                        ? "green"
                        : target.approvalStatus === "rejected"
                          ? "red"
                          : "amber"
                    }
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] text-primary/60">
                    {formatTimestamp(target.reportArtifact?.generatedAt)}
                  </p>
                  <Link
                    className="font-mono text-[10px] text-primary hover:text-[#00e639]"
                    to="/targets/$targetId"
                    params={{ targetId: target.targetId }}
                  >
                    Open target
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GuardianPanel>

      <GuardianPanel title="Download Library">
        {reportDownloads.length === 0 ? (
          <EmptyPanel message="No downloadable PDFs are available yet." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reportDownloads.map((download) => (
              <a
                key={download.id}
                className="flex items-center justify-between gap-3 border border-primary/10 bg-[#131313]/70 px-4 py-4 font-mono text-[10px] text-primary transition-colors hover:bg-primary/10"
                href={download.href}
              >
                <div>
                  <p className="uppercase">{download.label}</p>
                  <p className="mt-1 text-[#b9cacb]">{download.targetName}</p>
                </div>
                <span className="material-symbols-outlined">download</span>
              </a>
            ))}
          </div>
        )}
      </GuardianPanel>
    </div>
  );
}
