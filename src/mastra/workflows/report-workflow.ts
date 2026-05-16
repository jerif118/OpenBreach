import { createReportAiAdapter } from "~/ai/report-adapter";
import type { GenerateRemediationReportInput } from "~/shared";

export async function generateRemediationReport(input: GenerateRemediationReportInput) {
  const adapter = createReportAiAdapter();
  return await adapter.generateRemediationReport(input);
}

export const reportWorkflow = {
  id: "deff-acc-remediation-report-workflow",
  run: generateRemediationReport,
};
