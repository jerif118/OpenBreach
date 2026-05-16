import { Mastra } from "@mastra/core";
import { plainLanguageReportAgent } from "./agents/plain-language-report-agent";
import { reportAgent } from "./agents/report-agent";
import { reportWorkflow } from "./workflows/report-workflow";

export { plainLanguageReportAgent } from "./agents/plain-language-report-agent";
export { reportAgent } from "./agents/report-agent";
export { buildReportContext } from "./tools/report-context-tool";
export {
  generateRemediationReport,
  generateRemediationReportVariants,
  generateRemediationReportBatch,
  reportWorkflow,
} from "./workflows/report-workflow";

export const mastra = new Mastra({
  logger: false,
});

export const mastraRuntime = {
  agents: { reportAgent, plainLanguageReportAgent },
  workflows: { reportWorkflow },
};
