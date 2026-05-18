import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api.js";
import {
  formatDurationMs,
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

export const Route = createFileRoute("/guardian/runs")({
  component: WorkflowRunsPage,
});

const isConvexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

function WorkflowRunsPage() {
  const runs = useQuery(
    api.workflowRuns.listRecent,
    isConvexConfigured ? { limit: 100 } : "skip",
  );

  if (!isConvexConfigured) {
    return (
      <div className="space-y-8">
        <GuardianHeader
          title="Workflow Runs"
          subtitle="Live state-machine activity across all orchestrated targets."
        />
        <GuardianPanel title="Convex not configured">
          <EmptyPanel message="Set VITE_CONVEX_URL to a Convex deployment that has orchestrator runs persisted." />
        </GuardianPanel>
      </div>
    );
  }

  if (runs === undefined) {
    return (
      <div className="space-y-8">
        <GuardianHeader
          title="Workflow Runs"
          subtitle="Live state-machine activity across all orchestrated targets."
        />
        <GuardianPanel title="Loading runs">
          <EmptyPanel message="Loading recent workflow runs from Convex..." />
        </GuardianPanel>
      </div>
    );
  }

  const total = runs.length;
  const completed = runs.filter((entry) => entry.run.status === "completed")
    .length;
  const running = runs.filter((entry) => entry.run.status === "running").length;
  const passed = runs.filter(
    (entry) => entry.validation?.status === "passed",
  ).length;
  const errored = runs.filter(
    (entry) => entry.validation?.status === "error",
  ).length;
  const blocked = runs.filter(
    (entry) => entry.validation?.status === "blocked",
  ).length;

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Workflow Runs"
        subtitle="Live state-machine activity across all orchestrated targets. Each row is a real orchestrator pass with bounded controlled validation."
        action={
          <Link
            className="text-primary font-mono text-[10px] uppercase hover:text-[#00e639]"
            to="/guardian/validations"
          >
            Validation queue
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SmallMetric
          label="Total Runs"
          value={total.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Completed"
          tone="green"
          value={completed.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Running"
          tone="amber"
          value={running.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Validations Passed"
          tone="green"
          value={passed.toString().padStart(2, "0")}
        />
        <SmallMetric
          label="Validations Errored"
          tone="red"
          value={(errored + blocked).toString().padStart(2, "0")}
        />
      </section>

      <GuardianPanel title="Recent Orchestrator Runs">
        {runs.length === 0 ? (
          <EmptyPanel message="No workflow runs persisted yet. Run `pnpm orchestrate:run --all` to populate." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px] lg:text-xs">
              <thead>
                <tr className="border-primary/10 border-b text-[#b9cacb]">
                  <th className="px-2 py-2 font-normal">STARTED</th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    TARGET
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    RUN ID
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    PHASE
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    RUN STATUS
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    VALIDATION
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    DURATION
                  </th>
                  <th className="border-primary/10 border-l px-2 py-2 font-normal">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((entry) => (
                  <RunRow key={entry.run.runId} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GuardianPanel>
    </div>
  );
}

type RunEntry = NonNullable<
  ReturnType<typeof useQuery<typeof api.workflowRuns.listRecent>>
>[number];

function RunRow({ entry }: { entry: RunEntry }) {
  const { run, validation, targetName, municipalityExternalId } = entry;
  const validationLabel = validation
    ? validation.status.toUpperCase()
    : "PENDING";
  const validationTone: "green" | "red" | "amber" | "cyan" = validation
    ? validation.status === "passed"
      ? "green"
      : validation.status === "blocked"
        ? "amber"
        : "red"
    : "cyan";
  const causeCode = extractCauseCode(validation?.error);

  return (
    <tr className="hover:bg-primary/5">
      <td className="px-2 py-3 text-[#b9cacb]">
        {formatTimestamp(run.startedAt)}
      </td>
      <td className="border-primary/10 border-l px-2 py-3 text-[#00dbe9]">
        {targetName ?? run.targetId}
      </td>
      <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
        <span className="break-all">{run.runId}</span>
      </td>
      <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
        {formatWorkflowPhase(run.currentPhase)}
      </td>
      <td className="border-primary/10 border-l px-2 py-3">
        <ToneBadge
          label={formatWorkflowStatus(run.status)}
          tone={getWorkflowTone(run.status)}
        />
      </td>
      <td className="border-primary/10 border-l px-2 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <ToneBadge label={validationLabel} tone={validationTone} />
          {typeof validation?.httpStatus === "number" ? (
            <ToneBadge label={`HTTP ${validation.httpStatus}`} tone="cyan" />
          ) : null}
          {causeCode ? <ToneBadge label={causeCode} tone="amber" /> : null}
        </div>
      </td>
      <td className="border-primary/10 border-l px-2 py-3 text-[#b9cacb]">
        {formatDurationMs(run.durationMs)}
      </td>
      <td className="border-primary/10 border-l px-2 py-3">
        {municipalityExternalId ? (
          <Link
            className="text-primary hover:text-[#00e639]"
            to="/targets/$targetId"
            params={{ targetId: municipalityExternalId }}
          >
            Open target
          </Link>
        ) : (
          <span className="text-[#b9cacb]">--</span>
        )}
      </td>
    </tr>
  );
}

function extractCauseCode(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/\[([^\]]+)\]/);
  return match ? match[1] : null;
}
