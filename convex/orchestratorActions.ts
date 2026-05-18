"use node";

/**
 * UI-triggerable end-to-end orchestrator pass for a single municipality
 * target. Mirrors the CLI script `pnpm orchestrate:run -- --municipality <id>`
 * but exposes it as an authenticated Convex action that the dashboard can
 * call directly via `useAction(api.orchestratorActions.runForTarget)`.
 *
 * Runs in the Node runtime because:
 *   - `runControlledValidation` uses `node:crypto` for the evidence envelope.
 *   - Performs a real, bounded HTTP probe against the target's primary URL.
 *
 * Auth: gated to `operator` / `admin` profiles via the internal auth query.
 * Persistence: uses the existing `workflow:persistOrchestratorRun` internal
 * mutation, so the persisted shape is identical to CLI-driven runs.
 */

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { runOrchestratorForPipelineEntry } from "../src/workflow/orchestrator-runner";

export const runForTarget = action({
  args: { targetId: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    runId: string;
    targetId: string;
    validationStatus:
      | "passed"
      | "blocked"
      | "error"
      | "failed"
      | "inconclusive";
    requestCount: number;
    httpStatus: number | null;
  }> => {
    const { actor } = await ctx.runQuery(
      internal.orchestratorInternal.requireOperatorOrAdminActor,
      {},
    );

    const entry = await ctx.runQuery(
      internal.orchestratorInternal.loadPipelineEntry,
      { externalId: args.targetId },
    );

    if (!entry) {
      throw new Error(
        `Target "${args.targetId}" not found (no matching municipality).`,
      );
    }
    if (!entry.scan) {
      throw new Error(
        `Target "${args.targetId}" has no passive scan yet; run a scan before orchestrating.`,
      );
    }

    const { artifact, outcome } = await runOrchestratorForPipelineEntry(entry, {
      actor,
    });

    await ctx.runMutation(internal.workflow.persistOrchestratorRun, {
      // Cast: the runner returns Record<string, unknown> by design so the
      // shape stays decoupled from the persistence validator; the validator
      // on `persistOrchestratorRun` is the source of truth at the boundary.
      artifact: artifact as never,
    });

    return outcome;
  },
});
