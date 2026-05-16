import { Mastra } from "@mastra/core";
import { reportAgent } from "./agents/report-agent";
import { reportWorkflow } from "./workflows/report-workflow";

export { reportAgent } from "./agents/report-agent";
export { buildReportContext } from "./tools/report-context-tool";
export { generateRemediationReport, reportWorkflow } from "./workflows/report-workflow";

export const mastra = new Mastra({
  logger: false,
});

export const mastraRuntime = {
  agents: { reportAgent },
  workflows: { reportWorkflow },
};
