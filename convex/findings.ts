<<<<<<< HEAD
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type FindingDTO = {
  findingId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  evidence: string;
  remediationHint: string;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function toFindingDTO(finding: Doc<"findings">): FindingDTO {
  return {
    findingId: finding.findingId,
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    evidence: finding.evidenceIds?.join(", ") ?? "",
    remediationHint: "", // findings table doesn't have remediationHint field in current schema
    createdAt: finding.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────

/**
 * findings.listByTarget — Returns all findings for a target.
 * Fixture fallback: returns empty array when CONVEX_URL is not set.
 */
export const listByTarget = query({
  args: { targetId: v.string() },
  handler: async (ctx, args): Promise<FindingDTO[]> => {
    if (!process.env.CONVEX_URL) {
      return [];
    }

    const findings = await ctx.db
      .query("findings")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .order("desc")
      .take(50);

    return findings.map(toFindingDTO);
  },
});

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * findings.create — Creates a confirmed finding.
 * Always inserts (child records don't upsert).
 */
export const create = internalMutation({
  args: {
    finding: v.object({
      findingId: v.string(),
      resultId: v.string(),
      hypothesisId: v.string(),
      targetId: v.string(),
      severity: v.union(
        v.literal("info"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
      category: v.union(
        v.literal("tls"),
        v.literal("headers"),
        v.literal("cms"),
        v.literal("exposure"),
        v.literal("availability"),
        v.literal("known-vulnerability"),
      ),
      title: v.string(),
      description: v.string(),
      evidenceIds: v.array(v.string()),
      cveId: v.optional(v.string()),
      cweId: v.optional(v.string()),
      createdAt: v.string(),
      sourceAgent: v.string(),
      confirmedBy: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("findings", {
      findingId: args.finding.findingId,
      resultId: args.finding.resultId,
      hypothesisId: args.finding.hypothesisId,
      targetId: args.finding.targetId,
      severity: args.finding.severity,
      category: args.finding.category,
      title: args.finding.title,
      description: args.finding.description,
      evidenceIds: args.finding.evidenceIds,
      cveId: args.finding.cveId,
      cweId: args.finding.cweId,
      createdAt: args.finding.createdAt,
      sourceAgent: args.finding.sourceAgent,
      confirmedBy: args.finding.confirmedBy,
    });
    return { success: true, findingId: id };
  },
=======
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type FindingDTO = {
  findingId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  evidence: string;
  remediationHint: string;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function toFindingDTO(finding: Doc<"findings">): FindingDTO {
  return {
    findingId: finding.findingId,
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    evidence: finding.evidenceIds?.join(", ") ?? "",
    remediationHint: "", // findings table doesn't have remediationHint field in current schema
    createdAt: finding._creationTime.toString(),
  };
}

// ─────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────

/**
 * findings.listByTarget — Returns all findings for a target.
 * Fixture fallback: returns empty array when CONVEX_URL is not set.
 */
export const listByTarget = query({
  args: { targetId: v.string() },
  handler: async (ctx, args): Promise<FindingDTO[]> => {
    if (!process.env.CONVEX_URL) {
      return [];
    }

    const findings = await ctx.db
      .query("findings")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .order("desc")
      .take(50);

    return findings.map(toFindingDTO);
  },
});

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * findings.create — Creates a confirmed finding.
 * Always inserts (child records don't upsert).
 */
export const create = internalMutation({
  args: {
    finding: v.object({
      findingId: v.string(),
      resultId: v.string(),
      hypothesisId: v.string(),
      targetId: v.string(),
      severity: v.union(
        v.literal("info"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
      category: v.union(
        v.literal("tls"),
        v.literal("headers"),
        v.literal("cms"),
        v.literal("exposure"),
        v.literal("availability"),
        v.literal("known-vulnerability"),
      ),
      title: v.string(),
      description: v.string(),
      evidenceIds: v.array(v.string()),
      cveId: v.optional(v.string()),
      cweId: v.optional(v.string()),
      createdAt: v.string(),
      sourceAgent: v.string(),
      confirmedBy: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("findings", {
      findingId: args.finding.findingId,
      resultId: args.finding.resultId,
      hypothesisId: args.finding.hypothesisId,
      targetId: args.finding.targetId,
      severity: args.finding.severity,
      category: args.finding.category,
      title: args.finding.title,
      description: args.finding.description,
      evidenceIds: args.finding.evidenceIds,
      cveId: args.finding.cveId,
      cweId: args.finding.cweId,
      createdAt: args.finding.createdAt,
      sourceAgent: args.finding.sourceAgent,
      confirmedBy: args.finding.confirmedBy,
    });
    return { success: true, findingId: id };
  },
>>>>>>> f4ce9d058786105e3055708954d69c54290168ce
});