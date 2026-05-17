import { Link, createFileRoute } from "@tanstack/react-router";

import { formatTimestamp } from "../../features/openbreach/pipeline-data";
import {
  EmptyPanel,
  GuardianHeader,
  GuardianPanel,
} from "../../features/openbreach/guardian-ui";
import { useOpenBreachPipeline } from "../../hooks/use-openbreach-pipeline";

export const Route = createFileRoute("/guardian/logs")({
  component: LogsPage,
});

function LogsPage() {
  const { auditEvents } = useOpenBreachPipeline();

  return (
    <div className="space-y-8">
      <GuardianHeader
        title="Audit Logs"
        subtitle="Workflow and operator events recorded across intake, approval, validation, and reporting."
        action={
          <Link
            className="font-mono text-[10px] text-primary uppercase hover:text-[#00e639]"
            to="/guardian/validations"
          >
            Validation queue
          </Link>
        }
      />

      <GuardianPanel title="Event Stream">
        {auditEvents.length === 0 ? (
          <EmptyPanel message="No audit events have been recorded yet." />
        ) : (
          <div className="h-[32rem] overflow-auto border border-primary/10 bg-black/40 p-4 font-mono text-[10px]">
            {auditEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 border-b border-primary/5 py-3 text-[#b9cacb] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-primary">[{formatTimestamp(event.timestamp)}]</span>
                  <span className="text-[#00dbe9]">
                    {event.targetName} / {event.eventType}
                  </span>
                  <span>{event.actor}</span>
                </div>
                <Link
                  className="text-primary hover:text-[#00e639]"
                  to="/targets/$targetId"
                  params={{ targetId: event.targetId }}
                >
                  Open target
                </Link>
              </div>
            ))}
          </div>
        )}
      </GuardianPanel>
    </div>
  );
}
