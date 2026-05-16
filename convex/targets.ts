import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type TargetCardDTO = {
  targetId: string;
  organizationName: string;
  canonicalUrl: string;
  outOfScope: boolean;
};

export type LatestRunDTO = {
  runId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
};

export type EvidenceSummaryDTO = {
  total: number;
  types: string[];
};

export type HypothesesSummaryDTO = {
  total: number;
  byStatus: Record<string, number>;
};

export type FindingsSummaryDTO = {
  total: number;
  bySeverity: Record<string, number>;
};

export type ApprovalsSummaryDTO = {
  total: number;
  byStatus: Record<string, number>;
};

export type ReportMetadataDTO = {
  generatedAt: string | null;
  status: string;
};

export type TargetDetailDTO = {
  target: {
    targetId: string;
    targetType: "domain" | "url" | "ip";
    canonicalUrl: string;
    organizationName: string;
    outOfScope: boolean;
    createdAt: string;
    updatedAt: string;
  };
  latestRun: LatestRunDTO | null;
  evidenceSummary: EvidenceSummaryDTO;
  hypothesesSummary: HypothesesSummaryDTO;
  findingsSummary: FindingsSummaryDTO;
  approvalsSummary: ApprovalsSummaryDTO;
  reportMetadata: ReportMetadataDTO | null;
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function toTargetCardDTO(target: Doc<"targets">): TargetCardDTO {
  return {
    targetId: target.targetId,
    organizationName: target.organizationName,
    canonicalUrl: target.canonicalUrl,
    outOfScope: target.outOfScope ?? false,
  };
}

function toLatestRunDTO(run: Doc<"workflowRuns">): LatestRunDTO {
  return {
    runId: run.runId,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
  };
}

function toEvidenceSummaryDTO(
  evidence: Doc<"passiveScanEvidence">[],
): EvidenceSummaryDTO {
  const typesSet = new Set<string>();
  for (const e of evidence) {
    typesSet.add(e.observationType);
  }
  return {
    total: evidence.length,
    types: Array.from(typesSet),
  };
}

function toHypothesesSummaryDTO(
  hypotheses: Doc<"vulnerabilityHypotheses">[],
): HypothesesSummaryDTO {
  const byStatus: Record<string, number> = {};
  for (const h of hypotheses) {
    const status = h.status ?? "pending";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return {
    total: hypotheses.length,
    byStatus,
  };
}

function toFindingsSummaryDTO(
  findings: Doc<"findings">[],
): FindingsSummaryDTO {
  const bySeverity: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }
  return {
    total: findings.length,
    bySeverity,
  };
}

function toApprovalsSummaryDTO(
  gates: Doc<"approvalGates">[],
): ApprovalsSummaryDTO {
  const byStatus: Record<string, number> = {};
  for (const g of gates) {
    byStatus[g.status] = (byStatus[g.status] ?? 0) + 1;
  }
  return {
    total: gates.length,
    byStatus,
  };
}

// ─────────────────────────────────────────────────────────────────
// Fixture data (used when Convex is unavailable)
// ─────────────────────────────────────────────────────────────────

const FIXTURE_TARGET: TargetCardDTO = {
  targetId: "demo-target-001",
  organizationName: "Acme Corporation",
  canonicalUrl: "https://www.example.com",
  outOfScope: false,
};

// ─────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────

/**
 * targets.listDemo — Returns demo target cards ordered by _creationTime desc.
 * Fixture fallback: returns hardcoded demo target when CONVEX_URL is not set.
 */
export const listDemo = query({
  args: {},
  handler: async (ctx): Promise<TargetCardDTO[]> => {
    if (!process.env.CONVEX_URL) {
      return [FIXTURE_TARGET];
    }

    // Query all non-out-of-scope targets, ordered by creationTime desc
    const targets = await ctx.db
      .query("targets")
      .withIndex("by_outOfScope", (q) => q.eq("outOfScope", false))
      .order("desc")
      .take(20);

    return targets.map(toTargetCardDTO);
  },
});

/**
 * targets.getDemo — Returns full target detail with latest run, evidence/hypotheses/findings/approvals summaries.
 * Fixture fallback: constructs from embedded fixture data when CONVEX_URL is not set.
 */
export const getDemo = query({
  args: { targetId: v.string() },
  handler: async (ctx, args): Promise<TargetDetailDTO | null> => {
    // Fixture fallback when Convex is unavailable
    if (!process.env.CONVEX_URL) {
      if (args.targetId !== FIXTURE_TARGET.targetId) {
        return null;
      }
      return {
        target: {
          targetId: FIXTURE_TARGET.targetId,
          targetType: "domain",
          canonicalUrl: FIXTURE_TARGET.canonicalUrl,
          organizationName: FIXTURE_TARGET.organizationName,
          outOfScope: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        latestRun: null,
        evidenceSummary: { total: 0, types: [] },
        hypothesesSummary: { total: 0, byStatus: {} },
        findingsSummary: { total: 0, bySeverity: {} },
        approvalsSummary: { total: 0, byStatus: {} },
        reportMetadata: null,
      };
    }

    // Find target by targetId
    const target = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (!target) {
      return null;
    }

    // Find latest workflow run for this target (ordered by _creationTime desc, take 1)
    const runs = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .order("desc")
      .take(1);
    const latestRun = runs[0] ?? null;

    // Get evidence summaries, hypotheses, findings, approvals in parallel
    const [evidence, hypotheses, findings, gates] = await Promise.all([
      ctx.db
        .query("passiveScanEvidence")
        .withIndex("by_targetId_and_runId", (q) =>
          q.eq("targetId", args.targetId),
        )
        .take(100),
      ctx.db
        .query("vulnerabilityHypotheses")
        .withIndex("by_targetId_and_runId", (q) =>
          q.eq("targetId", args.targetId),
        )
        .take(100),
      ctx.db
        .query("findings")
        .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
        .take(100),
      ctx.db
        .query("approvalGates")
        .withIndex("by_hypothesisId", (q) => q.eq("hypothesisId", latestRun?.hypothesisId ?? ""))
        .take(100),
    ]);

    return {
      target: {
        targetId: target.targetId,
        targetType: "domain", // TODO: add targetType field to schema when needed
        canonicalUrl: target.canonicalUrl,
        organizationName: target.organizationName,
        outOfScope: target.outOfScope ?? false,
        createdAt: new Date(target._creationTime).toISOString(),
        updatedAt: new Date(target._creationTime).toISOString(),
      },
      latestRun: latestRun ? toLatestRunDTO(latestRun) : null,
      evidenceSummary: toEvidenceSummaryDTO(evidence),
      hypothesesSummary: toHypothesesSummaryDTO(hypotheses),
      findingsSummary: toFindingsSummaryDTO(findings),
      approvalsSummary: toApprovalsSummaryDTO(gates),
      reportMetadata: null,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * targets.upsert — Creates or updates a target profile.
 * Uses by_targetId index to check for existing documents.
 */
export const upsert = internalMutation({
  args: {
    target: v.object({
      targetId: v.string(),
      assetId: v.string(),
      organizationName: v.string(),
      canonicalUrl: v.string(),
      outOfScope: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.target.targetId))
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing document
      await ctx.db.patch(existing._id, {
        assetId: args.target.assetId,
        organizationName: args.target.organizationName,
        canonicalUrl: args.target.canonicalUrl,
        outOfScope: args.target.outOfScope ?? false,
      });
      return { success: true, docId: existing._id, targetId: existing.targetId };
    } else {
      // Insert new document
      const id = await ctx.db.insert("targets", {
        targetId: args.target.targetId,
        assetId: args.target.assetId,
        organizationName: args.target.organizationName,
        canonicalUrl: args.target.canonicalUrl,
        outOfScope: args.target.outOfScope ?? false,
      });
      return { success: true, docId: id, targetId: args.target.targetId };
    }
  },
});