import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOperatorOrAdmin } from "./auth";
import { appendAuditEvent } from "./lib/audit";
import {
  isConvexConfigured,
  loadFixture,
  mapFixtureToTargetProfileDto,
} from "./lib/fixtureFallback";
import type { AuditDetails, AuditEventDto } from "./types/audit";
import type { AuthorizationScopeDto } from "./types/authorization";
import type { TargetListItemDto, TargetProfileDto } from "./types/targets";
import type { Doc } from "./_generated/dataModel";
import type { WorkflowRunDto } from "./types/workflow";
import { validateTargetDomainBounds } from "./targets.validators";
import { decideTargetScope } from "../src/shared/target-scope-decision";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

function buildEnrichedMetadata(args: {
  metadata?: Record<string, unknown>;
  decisionMetadata: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(args.metadata ?? {}),
    ...args.decisionMetadata,
  };
}

function buildAuditDto(args: {
  eventId: string;
  targetId: string;
  eventType: string;
  actor: string;
  timestamp: string;
  runId?: string;
  details?: AuditDetails;
}): AuditEventDto {
  return {
    eventId: args.eventId,
    targetId: args.targetId,
    eventType: args.eventType,
    actor: args.actor,
    timestamp: args.timestamp,
    runId: args.runId,
    details: args.details,
  };
}

function buildRejectedAuditDetails(args: {
  reason: string;
  primaryUrl: string;
  validationLevel?: string;
  allowedAssetCount: number;
  deniedAssetCount: number;
}): AuditDetails {
  return {
    auditDecision: "rejected",
    reason: args.reason,
    primaryUrl: args.primaryUrl,
    validationLevel: args.validationLevel ?? "passive",
    allowedAssetCount: args.allowedAssetCount,
    deniedAssetCount: args.deniedAssetCount,
  };
}

// ============================================================================
// DTO Mappers
// ============================================================================

function toTargetProfileDto(doc: Doc<"targets">): TargetProfileDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    parentOrganization: doc.parentOrganization ?? undefined,
    geography: doc.geography
      ? {
          country: doc.geography.country,
          region: doc.geography.region,
          city: doc.geography.city,
        }
      : undefined,
    population: doc.population ?? undefined,
    latitude: doc.latitude ?? undefined,
    longitude: doc.longitude ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

function toTargetListItemDto(doc: Doc<"targets">): TargetListItemDto {
  return {
    targetId: doc.targetId,
    name: doc.name,
    primaryUrl: doc.primaryUrl,
    riskTier: doc.riskTier,
    classification: doc.classification,
    geography: doc.geography
      ? {
          country: doc.geography.country,
          region: doc.geography.region,
          city: doc.geography.city,
        }
      : undefined,
    population: doc.population ?? undefined,
    latitude: doc.latitude ?? undefined,
    longitude: doc.longitude ?? undefined,
    metadata: doc.metadata ?? undefined,
  };
}

function toWorkflowRunDto(doc: Doc<"workflowRuns">): WorkflowRunDto {
  const durationMs =
    doc.completedAt || doc.abortedAt
      ? new Date(doc.completedAt ?? doc.abortedAt!).getTime() -
        new Date(doc.startedAt).getTime()
      : undefined;

  return {
    runId: doc.runId,
    targetId: doc.targetId,
    status: doc.status,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt ?? undefined,
    abortedAt: doc.abortedAt ?? undefined,
    abortedReason: doc.abortedReason ?? undefined,
    currentPhase: doc.currentPhase ?? undefined,
    phases: doc.phases
      ? doc.phases.map((p) => ({
          phase: p.phase,
          enteredAt: p.enteredAt,
          exitedAt: p.exitedAt ?? undefined,
          rejectionReason: p.rejectionReason ?? undefined,
        }))
      : undefined,
    durationMs,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(
      `targetsPublic.list limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return limit;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Public query: list targets as bounded DTOs.
 * Falls back to fixture data when Convex is not configured.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeListLimit(args.limit);

    // Fixture fallback for demo mode (only when Convex is not configured in browser)
    if (!isConvexConfigured()) {
      try {
        const fixture = await loadFixture<unknown>("target-approved-public");
        const dto = mapFixtureToTargetProfileDto(fixture);
        const item: TargetListItemDto = {
          targetId: dto.targetId,
          name: dto.name,
          primaryUrl: dto.primaryUrl,
          riskTier: dto.riskTier,
          classification: dto.classification,
          geography: dto.geography,
          population: dto.population,
          latitude: dto.latitude,
          longitude: dto.longitude,
        };
        return [item];
      } catch {
        return [] as TargetListItemDto[];
      }
    }

    const docs = await ctx.db.query("targets").take(limit);
    const items: TargetListItemDto[] = [];

    for (const doc of docs) {
      const latestRun = await ctx.db
        .query("workflowRuns")
        .withIndex("by_targetId", (q) => q.eq("targetId", doc.targetId))
        .order("desc")
        .take(1);

      items.push({
        ...toTargetListItemDto(doc),
        latestRun: latestRun[0] ? toWorkflowRunDto(latestRun[0]) : null,
      });
    }

    return items;
  },
});

/**
 * Public query: get a single target by targetId, including latest run info.
 * Falls back to fixture data when Convex is not configured.
 */
export const get = query({
  args: { targetId: v.string() },
  handler: async (ctx, args) => {
    // Fixture fallback for demo mode
    if (!isConvexConfigured()) {
      try {
        const fixture = await loadFixture<unknown>("target-approved-public");
        const dto = mapFixtureToTargetProfileDto(fixture);
        if (dto.targetId === args.targetId) {
          return { ...dto, latestRun: null };
        }
        return null;
      } catch {
        return null;
      }
    }

    const doc = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (!doc) return null;

    const latestRun = await ctx.db
      .query("workflowRuns")
      .withIndex("by_targetId", (q) => q.eq("targetId", doc.targetId))
      .order("desc")
      .take(1);

    return {
      ...toTargetProfileDto(doc),
      latestRun: latestRun[0]
        ? {
            runId: latestRun[0].runId,
            status: latestRun[0].status,
            currentPhase: latestRun[0].currentPhase,
          }
        : null,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Protected public mutation: atomic target intake orchestration.
 * Creates target + authorization scope + workflow run + approval gate + audit event
 * atomically within a single Convex transaction.
 */
export const createFull = mutation({
  args: {
    targetId: v.string(),
    name: v.string(),
    primaryUrl: v.string(),
    classification: v.union(
      v.literal("public-sector"),
      v.literal("private"),
      v.literal("infrastructure"),
      v.literal("other"),
    ),
    parentOrganization: v.optional(v.string()),
    geography: v.optional(
      v.object({
        country: v.string(),
        region: v.string(),
        city: v.string(),
      }),
    ),
    population: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
    // Optional prompt-level extras stored in metadata
    approverName: v.optional(v.string()),
    allowedAssets: v.optional(v.array(v.string())),
    deniedAssets: v.optional(v.array(v.string())),
    validationLevel: v.optional(
      v.union(
        v.literal("passive"),
        v.literal("semiactive"),
        v.literal("controlled_validation"),
      ),
    ),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required.");
    }
    const profile = await requireOperatorOrAdmin(ctx);
    const actor = profile.name ?? identity.tokenIdentifier;
    const nowISO = new Date().toISOString();
    validateTargetDomainBounds(args);
    const scopeDecision = decideTargetScope({
      primaryUrl: args.primaryUrl,
      allowedAssets: args.allowedAssets,
      deniedAssets: args.deniedAssets,
      validationLevel: args.validationLevel,
      rateLimit: args.rateLimit,
    });

    if (scopeDecision.status === "rejected") {
      const runId = crypto.randomUUID();
      const eventId = crypto.randomUUID();
      const workflowRun: WorkflowRunDto = {
        runId,
        targetId: args.targetId,
        status: "rejected",
        startedAt: nowISO,
        abortedAt: nowISO,
        abortedReason: scopeDecision.reason,
        currentPhase: "intake",
        phases: [
          {
            phase: "intake",
            enteredAt: nowISO,
            exitedAt: nowISO,
            rejectionReason: scopeDecision.reason,
          },
        ],
      };
      const details = buildRejectedAuditDetails({
        reason: scopeDecision.reason,
        primaryUrl: args.primaryUrl,
        validationLevel: args.validationLevel,
        allowedAssetCount: args.allowedAssets?.length ?? 0,
        deniedAssetCount: args.deniedAssets?.length ?? 0,
      });

      await ctx.db.insert("workflowRuns", workflowRun);
      await appendAuditEvent(ctx, {
        targetId: args.targetId,
        eventType: "target-rejected",
        actor,
        eventId,
        timestamp: nowISO,
        runId,
        details,
      });

      return {
        decision: "rejected" as const,
        targetId: args.targetId,
        name: args.name,
        riskTier: "medium" as const,
        classification: args.classification,
        runId,
        status: "rejected" as const,
        currentPhase: "intake" as const,
        reason: scopeDecision.reason,
        authorizationScope: null,
        workflowRun,
        auditEvents: [
          buildAuditDto({
            eventId,
            targetId: args.targetId,
            eventType: "target-rejected",
            actor,
            timestamp: nowISO,
            runId,
            details,
          }),
        ],
      };
    }

    // -----------------------------------------------------------------------
    // 1. Duplicate check
    // -----------------------------------------------------------------------
    const existing = await ctx.db
      .query("targets")
      .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
      .unique();

    if (existing) {
      throw new Error(
        `Target with targetId "${args.targetId}" already exists.`,
      );
    }

    // -----------------------------------------------------------------------
    // 2. Merge extras into metadata
    // -----------------------------------------------------------------------
    const enrichedMetadata = buildEnrichedMetadata({
      metadata: args.metadata,
      decisionMetadata: scopeDecision.metadata,
    });

    // -----------------------------------------------------------------------
    // 3. Insert target
    // -----------------------------------------------------------------------
    await ctx.db.insert("targets", {
      targetId: args.targetId,
      name: args.name,
      primaryUrl: args.primaryUrl,
      riskTier: "medium",
      classification: args.classification,
      parentOrganization: args.parentOrganization,
      geography: args.geography,
      population: args.population,
      latitude: args.latitude,
      longitude: args.longitude,
      metadata:
        Object.keys(enrichedMetadata).length > 0 ? enrichedMetadata : undefined,
    });

    // -----------------------------------------------------------------------
    // 4. Insert authorization scope
    // -----------------------------------------------------------------------
    const authorizationId = crypto.randomUUID();
    const authorizationScope: AuthorizationScopeDto = {
      authorizationId,
      targetId: args.targetId,
      scopeType: scopeDecision.scopeType,
      grantedBy: actor,
      grantedAt: nowISO,
      constraints: scopeDecision.constraints,
      isExpired: false,
    };

    await ctx.db.insert("authorizationScopes", {
      authorizationId,
      targetId: args.targetId,
      scopeType: scopeDecision.scopeType,
      grantedBy: actor,
      grantedAt: nowISO,
      constraints: scopeDecision.constraints,
    });

    // -----------------------------------------------------------------------
    // 5. Insert approval gate (auto-approved for MVP)
    // -----------------------------------------------------------------------
    await ctx.db.insert("approvalGates", {
      gateId: crypto.randomUUID(),
      targetId: args.targetId,
      gateType: "intake",
      status: "approved",
      requestedAt: nowISO,
      requestedBy: actor,
      approvedBy: actor,
      approvedAt: nowISO,
    });

    // -----------------------------------------------------------------------
    // 6. Insert workflow run
    // -----------------------------------------------------------------------
    const runId = crypto.randomUUID();
    await ctx.db.insert("workflowRuns", {
      runId,
      targetId: args.targetId,
      status: "pending",
      startedAt: nowISO,
      currentPhase: "intake",
      phases: [{ phase: "intake", enteredAt: nowISO }],
    });

    // -----------------------------------------------------------------------
    // 7. Insert audit event
    // -----------------------------------------------------------------------
    const createdEventId = crypto.randomUUID();
    const grantedEventId = crypto.randomUUID();
    const workflowEventId = crypto.randomUUID();
    const createdDetails: AuditDetails = {
      approver: actor,
      autoApproved: true,
      auditDecision: scopeDecision.auditDecision,
      validationLevel: scopeDecision.validationLevel,
      scopeType: scopeDecision.scopeType,
      rateLimit: scopeDecision.rateLimit,
    };
    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "target-created",
      actor,
      eventId: createdEventId,
      timestamp: nowISO,
      runId,
      details: createdDetails,
    });

    const grantedDetails: AuditDetails = {
      gateType: "intake",
      autoApproved: true,
    };
    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "approval-granted",
      actor,
      eventId: grantedEventId,
      timestamp: nowISO,
      runId,
      details: grantedDetails,
    });

    const workflowDetails: AuditDetails = {
      phase: "intake",
      status: "pending",
    };
    await appendAuditEvent(ctx, {
      targetId: args.targetId,
      eventType: "workflow-started",
      actor,
      eventId: workflowEventId,
      timestamp: nowISO,
      runId,
      details: workflowDetails,
    });

    const workflowRun: WorkflowRunDto = {
      runId,
      targetId: args.targetId,
      status: "pending",
      startedAt: nowISO,
      currentPhase: "intake",
      phases: [{ phase: "intake", enteredAt: nowISO }],
    };

    // -----------------------------------------------------------------------
    // 8. Return DTO
    // -----------------------------------------------------------------------
    return {
      decision: "accepted" as const,
      targetId: args.targetId,
      name: args.name,
      riskTier: "medium" as const,
      classification: args.classification,
      runId,
      status: "pending" as const,
      currentPhase: "intake" as const,
      authorizationScope,
      workflowRun,
      auditEvents: [
        buildAuditDto({
          eventId: createdEventId,
          targetId: args.targetId,
          eventType: "target-created",
          actor,
          timestamp: nowISO,
          runId,
          details: createdDetails,
        }),
        buildAuditDto({
          eventId: grantedEventId,
          targetId: args.targetId,
          eventType: "approval-granted",
          actor,
          timestamp: nowISO,
          runId,
          details: grantedDetails,
        }),
        buildAuditDto({
          eventId: workflowEventId,
          targetId: args.targetId,
          eventType: "workflow-started",
          actor,
          timestamp: nowISO,
          runId,
          details: workflowDetails,
        }),
      ],
    };
  },
});
