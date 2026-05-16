import { SignInButton, UserButton, useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  getMockMunicipalityDetailState,
  getMunicipalityDetailSource,
  type MunicipalityDetailState,
} from "../features/municipality-detail/municipality-detail-data.ts";
import { useConvexMunicipalityDetail } from "../features/municipality-detail/use-municipality-detail.ts";
import type { ReportMetadata, RiskLevel, ScanFinding } from "../shared/contracts.ts";

export const Route = createFileRoute("/municipalities/$id")({
  component: MunicipalityDetailRoute,
});

const severityOrder = ["critical", "high", "medium", "low", "info"] as const;

const riskStyles: Record<RiskLevel, string> = {
  critical: "border-rose-400/50 bg-rose-500/15 text-rose-100",
  high: "border-orange-400/50 bg-orange-500/15 text-orange-100",
  medium: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  low: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
};

const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function MunicipalityDetailRoute() {
  const { id } = Route.useParams();
  const source = getMunicipalityDetailSource(import.meta.env.VITE_CONVEX_URL);

  if (source === "mock") {
    return <MunicipalityDetailShell state={getMockMunicipalityDetailState(id)} />;
  }

  return <ConvexMunicipalityDetail id={id} />;
}

function ConvexMunicipalityDetail({ id }: { id: string }) {
  const state = useConvexMunicipalityDetail(id);

  return <MunicipalityDetailShell state={state} />;
}

function MunicipalityDetailShell({ state }: { state: MunicipalityDetailState }) {
  if (state.status === "ready") {
    return <ReadyMunicipalityDetail state={state} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
          Municipality detail route - {state.source} data
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{getStateHeading(state)}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {getStateBody(state)}
        </p>
      </section>
    </main>
  );
}

function ReadyMunicipalityDetail({ state }: { state: Extract<MunicipalityDetailState, { status: "ready" }> }) {
  const { municipality, scan } = state.detail;
  const riskLevel = scan?.riskLevel ?? municipality.riskTier;
  const riskScore = scan?.riskScore ?? null;
  const findings = scan?.findings ?? [];
  const topActions = getTopActions(findings);
  const groupedFindings = getFindingsBySeverity(findings);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-2xl shadow-black/30">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                Municipality detail - {state.source} data
              </p>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    {municipality.name}
                  </h1>
                  <p className="mt-3 text-base leading-7 text-slate-300">
                    {municipality.state} municipality detail for observed public signals and recommended remediation.
                  </p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold capitalize ${riskStyles[riskLevel]}`}>
                  {riskLevel} risk
                </span>
              </div>

              <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
                <MetricCard label="Risk score" value={riskScore === null ? "No scan" : `${riskScore}/100`} />
                <MetricCard label="Population" value={formatPopulation(municipality.population)} />
                <MetricCard label="Website" value={municipality.websiteUrl.replace(/^https?:\/\//, "")} href={municipality.websiteUrl} />
              </dl>
            </div>

            <aside className="border-t border-white/10 bg-slate-950/60 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <h2 className="text-lg font-semibold text-white">Top recommended actions</h2>
              <ol className="mt-5 space-y-3">
                {topActions.map((action, index) => (
                  <li key={action} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-slate-950">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard label="State" value={municipality.state} />
          <InfoCard label="Scan timestamp" value={scan ? formatDateTime(scan.scannedAt) : "No scan available"} />
          <InfoCard label="Report metadata" value={state.reportStatus} />
        </section>

        <ReportDownloadPanel report={state.detail.report} />

        <ProtectedOperationsPanel />

        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Evidence</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Findings grouped by severity</h2>
            </div>
            <p className="text-sm text-slate-400">{findings.length} observed finding{findings.length === 1 ? "" : "s"}</p>
          </div>

          {scan ? (
            <div className="mt-6 space-y-5">
              {groupedFindings.length > 0 ? (
                groupedFindings.map(([severity, severityFindings]) => (
                  <section key={severity} aria-labelledby={`severity-${severity}`} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <h3 id={`severity-${severity}`} className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
                      {severity} severity
                    </h3>
                    <div className="mt-4 grid gap-4">
                      {severityFindings.map((finding) => (
                        <article key={finding.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{finding.category}</p>
                              <h4 className="mt-1 text-lg font-semibold text-white">{finding.title}</h4>
                            </div>
                            <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                              {finding.severity}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{finding.description}</p>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <EvidenceBlock label="Evidence" value={finding.evidence} />
                            <EvidenceBlock label="Recommended remediation" value={finding.remediationHint} />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <EmptyPanel title="No findings in the latest scan" body="The latest passive scan returned no finding rows for this municipality. Continue monitoring public signals before treating this as an all-clear result." />
              )}
            </div>
          ) : (
            <EmptyPanel title="No scan data available" body="This municipality exists in the detail payload, but no latest passive scan was available for evidence grouping." />
          )}
        </section>

        <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm leading-6 text-cyan-50">
          <h2 className="font-semibold text-white">Passive-scan safety disclaimer</h2>
          <p className="mt-2">
            This page summarizes observed public signals from passive checks. It does not confirm a breach, prove exploitability, or replace direct municipal validation.
          </p>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-lg font-semibold text-white">
        {href ? (
          <a className="text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 hover:text-cyan-100" href={href}>
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function EvidenceBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function ReportDownloadPanel({ report }: { report: ReportMetadata | null }) {
  const downloadUrl = getReportDownloadUrl(report);

  if (downloadUrl && report) {
    return (
      <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6 shadow-xl shadow-black/20 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Remediation report</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Generated PDF available</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-50/90">
              Download the technician remediation PDF generated from the latest observed public signals.
            </p>
            <p className="mt-2 text-xs text-emerald-50/70">{getReportMetadataSummary(report)}</p>
          </div>
          <a
            className="inline-flex w-fit items-center justify-center rounded-full bg-emerald-200 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-white"
            download
            href={downloadUrl}
          >
            Download remediation PDF
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.06] p-6 shadow-xl shadow-black/20 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Remediation report</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Report download unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {getReportUnavailableMessage(report)}
      </p>
      {report ? <p className="mt-2 text-xs text-slate-500">{getReportMetadataSummary(report)}</p> : null}
    </section>
  );
}

function ProtectedOperationsPanel() {
  if (!isClerkConfigured) {
    return (
      <ProtectedOperationsFrame eyebrow="Operator access" title="Protected operator actions deferred">
        <p className="text-sm leading-6 text-slate-300">
          Public detail viewing and PDF downloads remain available without sign-in. Protected report regeneration remains deferred to issue #10 until Clerk and Convex authorization are configured for that exact operation.
        </p>
      </ProtectedOperationsFrame>
    );
  }

  return <ConfiguredProtectedOperationsPanel />;
}

function ConfiguredProtectedOperationsPanel() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <ProtectedOperationsFrame eyebrow="Operator access" title="Auth state is loading">
        <p className="text-sm leading-6 text-slate-300">
          Public detail viewing and PDF downloads remain available without sign-in while protected operator state loads.
        </p>
      </ProtectedOperationsFrame>
    );
  }

  if (!isSignedIn) {
    return (
      <ProtectedOperationsFrame eyebrow="Operator access" title="Sign in to view protected operator actions">
        <p className="text-sm leading-6 text-slate-300">
          Public detail viewing and PDF downloads remain available without sign-in. Protected report regeneration remains deferred to issue #10 and cannot be invoked from this page.
        </p>
        <SignInButton mode="modal">
          <button className="mt-4 inline-flex w-fit items-center justify-center rounded-full border border-cyan-200/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100 hover:text-white" type="button">
            Sign in with Clerk
          </button>
        </SignInButton>
      </ProtectedOperationsFrame>
    );
  }

  return (
    <ProtectedOperationsFrame eyebrow="Operator access" title="Signed in for protected operator actions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-300">
          Public detail viewing and PDF downloads remain available without sign-in. Protected report regeneration remains deferred to issue #10 until Convex authorization is available for the operation.
        </p>
        <UserButton />
      </div>
    </ProtectedOperationsFrame>
  );
}

function ProtectedOperationsFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-cyan-300/15 bg-white/[0.06] p-6 shadow-xl shadow-black/20 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function getStateHeading(state: MunicipalityDetailState) {
  if (state.status === "ready") {
    return state.detail.municipality.name;
  }

  if (state.status === "loading") {
    return "Loading municipality detail";
  }

  if (state.status === "not-found") {
    return "Municipality not found";
  }

  return "Municipality detail unavailable";
}

function getStateBody(state: MunicipalityDetailState) {
  if (state.status === "ready") {
    return `${state.detail.municipality.name} has ${state.scanStatus} scan data and ${state.reportStatus} report metadata for ${state.id}.`;
  }

  if (state.status === "loading") {
    return `Loading observed public-signal detail data for ${state.id}.`;
  }

  if (state.status === "not-found") {
    return `No municipality detail payload was found for ${state.id}.`;
  }

  return state.message;
}

function getTopActions(findings: ScanFinding[]) {
  const actions = findings.map((finding) => finding.remediationHint);

  return [
    ...actions,
    "Review the latest observed public signals with the responsible municipal technical team.",
    "Prioritize remediation for high-severity public-facing services before cosmetic site changes.",
    "Re-run passive checks after remediation to verify the public evidence changed.",
  ].slice(0, 3);
}

function getFindingsBySeverity(findings: ScanFinding[]) {
  return severityOrder
    .map((severity) => [
      severity,
      findings.filter((finding) => finding.severity === severity),
    ] as const)
    .filter(([, severityFindings]) => severityFindings.length > 0);
}

function getReportDownloadUrl(report: ReportMetadata | null) {
  if (report?.status !== "completed" || !report.pdf) {
    return null;
  }

  return `/reports/${encodeURIComponent(report.pdf.fileName)}`;
}

function getReportUnavailableMessage(report: ReportMetadata | null) {
  if (!report) {
    return "No generated report metadata is available for this municipality yet. The risk evidence remains visible while report generation is pending.";
  }

  if (report.status === "pending") {
    return "Report generation is still pending. The download link will appear after completed PDF metadata is available.";
  }

  if (report.status === "failed") {
    return "Report generation failed, so no remediation PDF is currently available from the detail page.";
  }

  return "Report metadata exists, but it does not include a downloadable PDF reference yet.";
}

function getReportMetadataSummary(report: ReportMetadata) {
  const generated = report.generatedAt ? `Generated ${formatDateTime(report.generatedAt)}` : "Generation time unavailable";
  const fileName = report.pdf ? `File: ${report.pdf.fileName}` : "No PDF file metadata";

  return `${generated}. ${fileName}. Status: ${report.status}.`;
}

function formatPopulation(population: number | undefined) {
  return population === undefined ? "Unknown" : new Intl.NumberFormat().format(population);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
