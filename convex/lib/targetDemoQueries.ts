import type { QueryCtx } from "../_generated/server";
import {
  toApprovalDto,
  toDemoTargetCardDto,
  toEvidenceSummaryDto,
  toFindingDto,
  toHypothesisDto,
  toReportDto,
  toTargetProfileDto,
  toValidationResultDto,
  toWorkflowRunSummaryDto,
} from "../targets.dto";
import type {
  DemoTargetCardDto,
  DemoTargetDetailDto,
  DemoWorkflowRunSummaryDto,
} from "../types/demo";
import type { TargetProfileDto } from "../types/targets";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const DETAIL_SECTION_LIMIT = 25;

export function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `targets.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}

async function getLatestRun(
  ctx: QueryCtx,
  targetId: string,
): Promise<DemoWorkflowRunSummaryDto | null> {
  const latestRun = await ctx.db
    .query("workflowRuns")
    .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
    .order("desc")
    .take(1);
  return toWorkflowRunSummaryDto(latestRun[0]);
}

export async function listDemoTargets(
  ctx: QueryCtx,
  args: { limit?: number; riskTier?: TargetProfileDto["riskTier"] },
): Promise<DemoTargetCardDto[]> {
  const limit = normalizeListLimit(args.limit);
  const docs = args.riskTier
    ? await ctx.db
        .query("targets")
        .withIndex("by_riskTier", (q) => q.eq("riskTier", args.riskTier!))
        .take(limit)
    : await ctx.db.query("targets").take(limit);

  const cards: DemoTargetCardDto[] = [];
  for (const doc of docs) {
    cards.push(toDemoTargetCardDto(doc, await getLatestRun(ctx, doc.targetId)));
  }
  return cards;
}

export async function getDemoTargetDetail(
  ctx: QueryCtx,
  targetId: string,
): Promise<DemoTargetDetailDto | null> {
  const doc = await ctx.db
    .query("targets")
    .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
    .unique();

  if (!doc) return null;

  const [
    latestRun,
    evidence,
    hypotheses,
    approvals,
    validationDocs,
    findings,
    reports,
  ] = await Promise.all([
    getLatestRun(ctx, targetId),
    ctx.db
      .query("passiveScanEvidence")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(DETAIL_SECTION_LIMIT),
    ctx.db
      .query("vulnerabilityHypotheses")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(DETAIL_SECTION_LIMIT),
    ctx.db
      .query("approvalGates")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(DETAIL_SECTION_LIMIT),
    ctx.db
      .query("validationResults")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(DETAIL_SECTION_LIMIT),
    ctx.db
      .query("findings")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(DETAIL_SECTION_LIMIT),
    ctx.db
      .query("reportArtifacts")
      .withIndex("by_targetId", (q) => q.eq("targetId", targetId))
      .order("desc")
      .take(DETAIL_SECTION_LIMIT),
  ]);

  const findingsByValidationId = new Map<string, number>();
  for (const finding of findings) {
    if (!finding.validationResultId) continue;
    findingsByValidationId.set(
      finding.validationResultId,
      (findingsByValidationId.get(finding.validationResultId) ?? 0) + 1,
    );
  }

  return {
    target: toTargetProfileDto(doc),
    latestRun,
    evidence: evidence.map(toEvidenceSummaryDto),
    hypotheses: hypotheses.map(toHypothesisDto),
    approvals: approvals.map(toApprovalDto),
    validationResults: validationDocs.map((result) =>
      toValidationResultDto(
        result,
        findingsByValidationId.get(result.resultId) ?? 0,
      ),
    ),
    findings: findings.map(toFindingDto),
    reports: reports.map(toReportDto),
  };
}
