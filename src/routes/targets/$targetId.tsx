import { Link, createFileRoute } from "@tanstack/react-router";

import { OpenBreachAppFrame } from "../../features/openbreach/app-frame";
import {
  formatClassification,
  formatDurationMs,
  formatTimestamp,
  formatWorkflowPhase,
  formatWorkflowStatus,
  getFindingTone,
  getWorkflowTone,
} from "../../features/openbreach/pipeline-data";
import { useOpenBreachPipeline } from "../../hooks/use-openbreach-pipeline";

export const Route = createFileRoute("/targets/$targetId")({
  component: TargetDetailPage,
});

const PANEL_CLASS_NAME =
  "relative overflow-hidden border border-primary/15 bg-surface-container-low p-6 pixel-corner";
const INSET_CLASS_NAME = "border border-primary/10 bg-surface px-4 py-4";
const ACTION_CLASS_NAME =
  "border px-4 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition pixel-corner focus:ring-2 focus:outline-none";

function TargetDetailPage() {
  const { targetId } = Route.useParams();
  const { isLoading, targets } = useOpenBreachPipeline();
  const target = targets.find((entry) => entry.targetId === targetId) ?? null;

  if (isLoading) {
    return (
      <OpenBreachAppFrame>
        <div className={`${PANEL_CLASS_NAME} mx-auto max-w-7xl`}>
          <p className="text-primary font-mono text-sm">
            Loading target pipeline...
          </p>
        </div>
      </OpenBreachAppFrame>
    );
  }

  if (!target) {
    return (
      <OpenBreachAppFrame>
        <div className="border-error/30 bg-error/10 pixel-corner mx-auto max-w-4xl border p-8">
          <p className="text-error font-mono text-sm">
            Target not found in the current pipeline snapshot.
          </p>
          <Link
            to="/targets"
            className={`${ACTION_CLASS_NAME} border-outline/40 text-on-surface hover:bg-primary/10 hover:text-primary focus:ring-primary/30 mt-4 inline-flex`}
          >
            Back to target list
          </Link>
        </div>
      </OpenBreachAppFrame>
    );
  }

  const statusTone = target.findings.length
    ? getFindingTone(target.findings[0]?.severity)
    : getWorkflowTone(target.latestRun?.status);

  return (
    <OpenBreachAppFrame>
      <section className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="border-primary/20 flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-primary font-mono text-[10px] tracking-[0.28em] uppercase">
              target / detail / pipeline
            </p>
            <h1 className="font-display text-on-surface mt-3 text-4xl uppercase">
              {target.name}
            </h1>
            <p className="text-primary mt-2 font-mono text-sm break-all">
              {target.primaryUrl}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={formatWorkflowStatus(target.latestRun?.status)}
              tone={statusTone}
            />
            <Link
              to="/targets"
              className={`${ACTION_CLASS_NAME} border-outline/40 text-on-surface hover:bg-primary/10 hover:text-primary focus:ring-primary/30`}
            >
              ← Target List
            </Link>
            <Link
              to="/guardian/reports"
              className={`${ACTION_CLASS_NAME} border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 focus:ring-primary/30`}
            >
              Reports
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Approval Gate"
            value={target.approvalStatus.toUpperCase()}
          />
          <MetricCard
            label="Current Phase"
            value={formatWorkflowPhase(target.latestRun?.currentPhase)}
          />
          <MetricCard label="Coverage" value={`${target.coverage}%`} />
          <MetricCard
            label="Findings"
            tone={target.findings.length > 0 ? "red" : "green"}
            value={target.findings.length.toString().padStart(2, "0")}
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <section className={PANEL_CLASS_NAME}>
            <SectionTitle title="Target Summary" />
            <p className="text-on-surface-variant font-mono text-sm leading-6">
              {target.summary}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem label="Target ID" value={target.targetId} />
              <DetailItem
                label="Classification"
                value={formatClassification(target.classification)}
              />
              <DetailItem
                label="Validation Level"
                value={target.validationLevel
                  .replaceAll("_", " ")
                  .toUpperCase()}
              />
              <DetailItem
                label="Rate Limit"
                value={`${target.rateLimit} rpm`}
              />
              <DetailItem
                label="Allowed Assets"
                value={target.allowedAssets.length.toString()}
              />
              <DetailItem
                label="Denied Assets"
                value={target.deniedAssets.length.toString()}
              />
            </dl>
          </section>

          <section className={PANEL_CLASS_NAME}>
            <SectionTitle title="Run Snapshot" />
            <dl className="grid gap-4">
              <DetailItem
                label="Run ID"
                value={target.latestRun?.runId ?? "No run assigned"}
              />
              <DetailItem
                label="Phase"
                value={formatWorkflowPhase(target.latestRun?.currentPhase)}
              />
              <DetailItem
                label="Duration"
                value={formatDurationMs(target.latestRun?.durationMs)}
              />
              <DetailItem
                label="Last Update"
                value={formatTimestamp(
                  target.reportArtifact?.generatedAt ??
                    target.validation?.executedAt ??
                    target.latestRun?.completedAt ??
                    target.latestRun?.startedAt,
                )}
              />
            </dl>
          </section>

          <section className={PANEL_CLASS_NAME}>
            <SectionTitle title="Evidence Snapshot" />
            {target.evidence ? (
              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem
                  label="Source"
                  value={target.evidence.source.toUpperCase()}
                />
                <DetailItem
                  label="Collected"
                  value={formatTimestamp(target.evidence.collectedAt)}
                />
                <DetailItem
                  label="HTTP Status"
                  value={String(target.evidence.httpStatus ?? "--")}
                />
                <DetailItem
                  label="Reachable"
                  value={target.evidence.reachable ? "YES" : "NO"}
                />
                <DetailItem
                  label="TLS Issuer"
                  value={target.evidence.tls?.issuer ?? "Unavailable"}
                />
                <DetailItem
                  label="Final URL"
                  value={target.evidence.finalUrl ?? target.primaryUrl}
                />
              </div>
            ) : (
              <EmptyMessage message="No passive evidence has been attached to this target yet." />
            )}
          </section>

          <section className={PANEL_CLASS_NAME}>
            <SectionTitle title="Validation Result" />
            {target.validation ? (
              <div className="space-y-4">
                <StatusBadge
                  label={target.validation.status.toUpperCase()}
                  tone={target.validation.status === "passed" ? "green" : "red"}
                />
                <p className="text-on-surface-variant font-mono text-sm">
                  {target.validation.summary ?? "Validation summary pending."}
                </p>
                <DetailItem
                  label="Executed"
                  value={formatTimestamp(target.validation.executedAt)}
                />
                <DetailItem
                  label="Operator"
                  value={target.validation.executedBy}
                />
              </div>
            ) : (
              <EmptyMessage message="No controlled validation result has been recorded yet." />
            )}
          </section>

          <section className={`${PANEL_CLASS_NAME} xl:col-span-2`}>
            <SectionTitle title="Findings And Reports" />
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                {target.findings.length > 0 ? (
                  target.findings.map((finding) => (
                    <div
                      key={finding.findingId}
                      className="border-primary/10 bg-surface border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-on-surface-variant font-mono text-[10px] tracking-[0.2em] uppercase">
                            {finding.category ?? "finding"}
                          </p>
                          <h3 className="font-display text-on-surface mt-2 text-xl uppercase">
                            {finding.title}
                          </h3>
                        </div>
                        <StatusBadge
                          label={finding.severity.toUpperCase()}
                          tone={getFindingTone(finding.severity)}
                        />
                      </div>
                      <p className="text-on-surface-variant mt-3 font-mono text-sm leading-6">
                        {finding.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyMessage message="No findings have been attached to this target yet." />
                )}
              </div>

              <div className="border-primary/15 bg-surface pixel-corner border px-4 py-4">
                <p className="text-primary font-mono text-[10px] tracking-[0.24em] uppercase">
                  Report Artifacts
                </p>
                <p className="text-on-surface-variant mt-3 font-mono text-sm">
                  {target.reportArtifact
                    ? `Latest artifact status: ${target.reportArtifact.status.toUpperCase()}`
                    : "No report artifact has been generated for this target yet."}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {target.reportDownloads.length > 0 ? (
                    target.reportDownloads.map((download) => (
                      <a
                        key={download.id}
                        className="border-primary/20 bg-surface-container-low text-primary pixel-corner hover:bg-primary/10 border px-4 py-3 font-mono text-[10px] tracking-[0.18em] uppercase transition"
                        download={download.fileName}
                        href={download.href}
                      >
                        {download.label}
                      </a>
                    ))
                  ) : (
                    <EmptyMessage message="Download links will appear here when report artifacts are available." />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={`${PANEL_CLASS_NAME} xl:col-span-2`}>
            <SectionTitle title="Audit Trail" />
            <div className="space-y-3">
              {target.auditEvents.length > 0 ? (
                target.auditEvents.map((event) => (
                  <div
                    key={event.eventId}
                    className="border-primary/10 bg-surface flex flex-col gap-2 border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-primary font-mono text-[10px] tracking-[0.2em] uppercase">
                        {event.eventType}
                      </p>
                      <p className="text-on-surface-variant mt-1 font-mono text-sm">
                        {event.actor}
                      </p>
                    </div>
                    <p className="text-on-surface-variant font-mono text-sm">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyMessage message="No audit events are currently attached to this target." />
              )}
            </div>
          </section>
        </div>
      </section>
    </OpenBreachAppFrame>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="border-primary/10 font-display text-primary mb-4 border-b pb-3 text-xl uppercase">
      {title}
    </h2>
  );
}

function MetricCard({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "cyan" | "green" | "red";
}) {
  const toneClassName =
    tone === "green"
      ? "border-secondary-fixed-dim/25 bg-secondary-fixed-dim/10 text-secondary-fixed-dim"
      : tone === "red"
        ? "border-error/25 bg-error/10 text-error"
        : "border-primary/25 bg-primary/10 text-primary";

  return (
    <div className={`pixel-corner border p-5 ${toneClassName}`}>
      <p className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-70">
        {label}
      </p>
      <p className="font-display mt-3 text-3xl">{value}</p>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red" | "cyan" | "amber";
}) {
  const className =
    tone === "green"
      ? "border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 text-secondary-fixed-dim"
      : tone === "red"
        ? "border-error/30 bg-error/10 text-error"
        : tone === "amber"
          ? "border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffd166]"
          : "border-primary/30 bg-primary/10 text-primary";

  return (
    <span
      className={`pixel-corner inline-flex border px-3 py-1 font-mono text-[10px] tracking-[0.18em] uppercase ${className}`}
    >
      {label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={INSET_CLASS_NAME}>
      <dt className="text-on-surface-variant font-mono text-[10px] tracking-[0.18em] uppercase">
        {label}
      </dt>
      <dd className="text-on-surface mt-2 font-mono text-sm break-words">
        {value}
      </dd>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="border-primary/10 bg-surface text-on-surface-variant pixel-corner border border-dashed px-4 py-4 font-mono text-sm">
      {message}
    </div>
  );
}
