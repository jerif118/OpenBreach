import type { Municipality, ScanResult } from "~/shared";

export type ReportContext = {
  municipality: Municipality;
  scan: ScanResult;
};

export function buildReportContext(municipality: Municipality, scan: ScanResult): ReportContext {
  return { municipality, scan };
}
