import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────────

type GateStatus = "pending" | "approved" | "rejected" | "expired" | "revoked";

const VALID_TRANSITIONS: Record<GateStatus, GateStatus[]> = {
  pending: ["approved", "rejected", "expired"],
  approved: ["revoked"],
  rejected: [], // terminal
  expired: [], // terminal
  revoked: [], // terminal
};

function validateTransition(current: GateStatus, next: GateStatus): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid state transition from ${current} to ${next}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────

/**
 * approvalGates.updateStatus — Updates approval gate status with state transition validation.
 * Uses by_gateId index to find the gate.
 */
export const updateStatus = internalMutation({
  args: {
    gateId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    reviewerId: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("approvalGates")
      .withIndex("by_gateId", (q) => q.eq("gateId", args.gateId))
      .unique();

    if (!existing) {
      throw new Error(`Gate not found: ${args.gateId}`);
    }

    // Validate state transition
    validateTransition(existing.status as GateStatus, args.status);

    // Update with reviewedAt timestamp
    await ctx.db.patch(existing._id, {
      status: args.status,
      reviewerId: args.reviewerId,
      reviewNotes: args.reviewNotes,
      reviewedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});