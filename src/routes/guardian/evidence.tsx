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

export const Route = createFileRoute("/guardian/evidence")({
  component: EvidenceRepository,
});

function EvidenceRepository() {
  const { targets } = useOpenBreachPipeline();
  const evidenceTargets = targets.filter((target) => !!target.evidence);
  const tlsHealthy = evidenceTargets.filter(
    (target) => target.evidence?.tls?.valid,
  ).length;
  const reachable = evidenceTargets.filter(
    (target) => target.evidence?.reachable,
  ).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Evidence Repository"
        subtitle="Normalized passive evidence, transport metadata, and collection timestamps for the active pipeline."
        action={
          <Link
            className="text-primary font-mono text-[10px] uppercase hover:text-[#00e639]"
            to="/guardian/network"
          >
            Scope map
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SmallMetric
          label="Evidence Records"
          value={evidenceTargets.length.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="TLS Healthy"
          tone="green"
          value={tlsHealthy.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Reachable Targets"
          value={reachable.toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Evidence Ledger">
        {evidenceTargets.length === 0 ? (
          <EmptyPanel message="No passive evidence has been collected yet." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {evidenceTargets.map((target) => (
              <div
                key={target.targetId}
                className="border-primary/10 border bg-[#131313]/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.2em] text-[#00dbe9] uppercase">
                      {target.targetId}
                    </p>
                    <h3 className="font-display text-primary mt-2 text-base uppercase">
                      {target.name}
                    </h3>
                  </div>
                  <ToneBadge
                    label={target.evidence?.reachable ? "REACHABLE" : "OFFLINE"}
                    tone={target.evidence?.reachable ? "green" : "red"}
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <EvidenceItem
                    label="Source"
                    value={target.evidence?.source.toUpperCase() ?? "--"}
                  />
                  <EvidenceItem
                    label="Collected"
                    value={formatTimestamp(target.evidence?.collectedAt)}
                  />
                  <EvidenceItem
                    label="HTTP"
                    value={String(target.evidence?.httpStatus ?? "--")}
                  />
                  <EvidenceItem
                    label="TLS Issuer"
                    value={target.evidence?.tls?.issuer ?? "Unavailable"}
                  />
                </div>

                <Link
                  className="text-primary mt-4 inline-flex font-mono text-[10px] hover:text-[#00e639]"
                  to="/targets/$targetId"
                  params={{ targetId: target.targetId }}
                >
                  Open target detail
                </Link>
              </div>
            ))}
          </div>
        )}
      </GuardianPanel>
    </div>
  );
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-primary/10 border bg-[#0e0e0e] p-3">
      <p className="font-mono text-[10px] text-[#b9cacb] uppercase">{label}</p>
      <p className="mt-2 font-mono text-[10px] break-words text-white">
        {value}
      </p>
    </div>
  );
}
