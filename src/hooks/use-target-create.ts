import { useCallback, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../convex/_generated/api.js";
import type { TargetProfileDto } from "../../convex/types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Return shape of the `targetsPublic.createFull` mutation.
 */
export interface TargetCreateResult {
  targetId: string;
  name: string;
  riskTier: TargetProfileDto["riskTier"];
  classification: TargetProfileDto["classification"];
  runId: string;
  status: "pending";
  currentPhase: "intake";
}

export interface UseTargetCreateReturn {
  createTarget: (args: CreateTargetArgs) => Promise<TargetCreateResult>;
  isPending: boolean;
  error: Error | null;
  data: TargetCreateResult | null;
}

/**
 * Arguments accepted by `createTarget` — matches the Convex mutation args.
 */
export interface CreateTargetArgs {
  targetId: string;
  name: string;
  primaryUrl: string;
  classification: "public-sector" | "private" | "infrastructure" | "other";
  parentOrganization?: string;
  geography?: { country: string; region: string; city: string };
  population?: number;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  approverName?: string;
  allowedAssets?: string[];
  deniedAssets?: string[];
  validationLevel?: string;
  rateLimit?: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useTargetCreate(): UseTargetCreateReturn {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TargetCreateResult | null>(null);

  const mutate = useMutation(api.targetsPublic.createFull);

  const createTarget = useCallback(
    async (args: CreateTargetArgs): Promise<TargetCreateResult> => {
      console.log("🔥 useTargetCreate: starting mutation with args:", args);
      setIsPending(true);
      setError(null);

      try {
        const result = await mutate(args);
        console.log("🔥 useTargetCreate: mutation succeeded:", result);
        setData(result);
        return result;
      } catch (err) {
        console.error("🔥 useTargetCreate: mutation failed:", err);
        const normalizedError =
          err instanceof Error
            ? err
            : new Error(String(err ?? "Target creation failed"));
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsPending(false);
      }
    },
    [mutate],
  );

  return { createTarget, isPending, error, data };
}
