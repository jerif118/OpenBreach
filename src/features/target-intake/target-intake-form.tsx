import { useCallback, useState } from "react";

import { Button } from "~/components/ui/Button.tsx";
import { FormCard } from "~/components/ui/FormCard.tsx";
import { FormField } from "~/components/ui/FormField.tsx";
import { FormSelect } from "~/components/ui/FormSelect.tsx";
import {
  INPUT_BASE,
  INPUT_ERROR,
  INPUT_FOCUS,
  LABEL_BASE,
  ERROR_TEXT,
} from "~/lib/terminal-styles";
import {
  targetIntakeInputSchema,
  type TargetIntakeInput,
} from "~/shared/contracts.ts";
import {
  useTargetCreate,
  type TargetCreateResult,
} from "~/hooks/use-target-create.ts";

// ============================================================================
// Types
// ============================================================================

export interface TargetIntakeFormProps {
  onSuccess?: (result: TargetCreateResult) => void;
}

// ============================================================================
// Options
// ============================================================================

const CLASSIFICATION_OPTIONS = [
  { value: "public-sector", label: "Public Sector" },
  { value: "private", label: "Private" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "other", label: "Other" },
];

const VALIDATION_LEVEL_OPTIONS = [
  { value: "passive", label: "Passive" },
  { value: "semiactive", label: "Semi-Active" },
  { value: "controlled_validation", label: "Controlled Validation" },
];

// ============================================================================
// Component
// ============================================================================

export function TargetIntakeForm({ onSuccess }: TargetIntakeFormProps) {
  const { createTarget, isPending, error: apiError } = useTargetCreate();

  // Field states
  const [targetId, setTargetId] = useState("");
  const [name, setName] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [classification, setClassification] = useState<
    "public-sector" | "private" | "infrastructure" | "other"
  >("public-sector");
  const [allowedAssets, setAllowedAssets] = useState("");
  const [deniedAssets, setDeniedAssets] = useState("");
  const [validationLevel, setValidationLevel] = useState<
    "passive" | "semiactive" | "controlled_validation"
  >("passive");
  const [rateLimit, setRateLimit] = useState("10");
  const [approverName, setApproverName] = useState("");

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setGlobalError(null);

      const rawInput: TargetIntakeInput = {
        targetId,
        name,
        primaryUrl,
        classification,
        allowedAssets: allowedAssets || undefined,
        deniedAssets: deniedAssets || undefined,
        validationLevel,
        rateLimit: rateLimit === "" ? 10 : Number(rateLimit),
        approverName: approverName || undefined,
      };

      const parseResult = targetIntakeInputSchema.safeParse(rawInput);
      if (!parseResult.success) {
        const errors: Record<string, string> = {};
        for (const issue of parseResult.error.issues) {
          const key = issue.path[0] as string;
          if (key && !errors[key]) {
            errors[key] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }

      const validated = parseResult.data;

      // Transform textarea comma-separated values to arrays
      const allowedAssetsArray = validated.allowedAssets
        ? validated.allowedAssets
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;

      const deniedAssetsArray = validated.deniedAssets
        ? validated.deniedAssets
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;

      try {
        console.log("🚀 Calling createTarget with:", {
          name: validated.name,
          primaryUrl: validated.primaryUrl,
          classification: validated.classification,
        });
        const result = await createTarget({
          targetId: validated.targetId,
          name: validated.name,
          primaryUrl: validated.primaryUrl,
          classification: validated.classification,
          allowedAssets: allowedAssetsArray,
          deniedAssets: deniedAssetsArray,
          validationLevel: validated.validationLevel,
          rateLimit: validated.rateLimit,
          approverName: validated.approverName,
        });
        console.log("✅ createTarget succeeded:", result);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err) {
        console.error("❌ createTarget failed:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("Connection refused") ||
          errorMessage.includes("WebSocket")
        ) {
          setGlobalError(
            "[ERROR] Cannot connect to Convex backend. Please ensure 'pnpm convex:dev' is running.",
          );
        } else {
          setGlobalError(
            apiError?.message ?? "Target creation failed. Please try again.",
          );
        }
      }
    },
    [
      targetId,
      name,
      primaryUrl,
      classification,
      allowedAssets,
      deniedAssets,
      validationLevel,
      rateLimit,
      approverName,
      createTarget,
      apiError,
      onSuccess,
    ],
  );

  const handleAllowedAssetsChange = (value: string) => {
    setAllowedAssets(value);
    clearFieldError("allowedAssets");
  };

  const handleDeniedAssetsChange = (value: string) => {
    setDeniedAssets(value);
    clearFieldError("deniedAssets");
  };

  return (
    <FormCard title="NEW TARGET PROFILE">
      <form onSubmit={handleSubmit} className="grid gap-6">
        {/* Row 1: targetId + name */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Target ID"
            name="targetId"
            value={targetId}
            onChange={(v) => {
              setTargetId(v);
              clearFieldError("targetId");
            }}
            error={fieldErrors.targetId}
            placeholder="e.g. mx-guadalajara-001"
            required
            disabled={isPending}
          />
          <FormField
            label="Name"
            name="name"
            value={name}
            onChange={(v) => {
              setName(v);
              clearFieldError("name");
            }}
            error={fieldErrors.name}
            placeholder="e.g. Guadalajara Municipal Portal"
            required
            disabled={isPending}
          />
        </div>

        {/* Row 2: primaryUrl */}
        <div>
          <FormField
            label="Primary URL"
            name="primaryUrl"
            type="url"
            value={primaryUrl}
            onChange={(v) => {
              setPrimaryUrl(v);
              clearFieldError("primaryUrl");
            }}
            error={fieldErrors.primaryUrl}
            placeholder="https://example.gov.mx"
            required
            disabled={isPending}
          />
        </div>

        {/* Row 3: classification + validationLevel */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FormSelect
            label="Classification"
            name="classification"
            value={classification}
            onChange={(v) => {
              setClassification(v as TargetIntakeInput["classification"]);
              clearFieldError("classification");
            }}
            options={CLASSIFICATION_OPTIONS}
            error={fieldErrors.classification}
            required
            disabled={isPending}
          />
          <FormSelect
            label="Validation Level"
            name="validationLevel"
            value={validationLevel}
            onChange={(v) => {
              setValidationLevel(v as TargetIntakeInput["validationLevel"]);
              clearFieldError("validationLevel");
            }}
            options={VALIDATION_LEVEL_OPTIONS}
            error={fieldErrors.validationLevel}
            required
            disabled={isPending}
          />
        </div>

        {/* Row 4: allowedAssets + deniedAssets (textareas) */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="w-full">
            <label htmlFor="allowedAssets" className={LABEL_BASE}>
              Allowed Assets
              <span className="ml-1 text-on-surface-variant/60">
                (comma-separated URLs)
              </span>
            </label>
            <textarea
              id="allowedAssets"
              name="allowedAssets"
              value={allowedAssets}
              onChange={(e) => handleAllowedAssetsChange(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="https://api.example.gov.mx, https://admin.example.gov.mx"
              className={`${INPUT_BASE} ${fieldErrors.allowedAssets ? INPUT_ERROR : INPUT_FOCUS} resize-y`}
            />
            {fieldErrors.allowedAssets && (
              <p className={`mt-1.5 font-mono text-sm ${ERROR_TEXT}`}>
                {fieldErrors.allowedAssets}
              </p>
            )}
          </div>
          <div className="w-full">
            <label htmlFor="deniedAssets" className={LABEL_BASE}>
              Denied Assets
              <span className="ml-1 text-on-surface-variant/60">
                (comma-separated URLs)
              </span>
            </label>
            <textarea
              id="deniedAssets"
              name="deniedAssets"
              value={deniedAssets}
              onChange={(e) => handleDeniedAssetsChange(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="https://internal.example.gov.mx"
              className={`${INPUT_BASE} ${fieldErrors.deniedAssets ? INPUT_ERROR : INPUT_FOCUS} resize-y`}
            />
            {fieldErrors.deniedAssets && (
              <p className={`mt-1.5 font-mono text-sm ${ERROR_TEXT}`}>
                {fieldErrors.deniedAssets}
              </p>
            )}
          </div>
        </div>

        {/* Row 5: rateLimit + approverName */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Rate Limit"
            name="rateLimit"
            type="number"
            value={rateLimit}
            onChange={(v) => {
              setRateLimit(v);
              clearFieldError("rateLimit");
            }}
            error={fieldErrors.rateLimit}
            placeholder="10"
            disabled={isPending}
          />
          <FormField
            label="Approver Name"
            name="approverName"
            value={approverName}
            onChange={(v) => {
              setApproverName(v);
              clearFieldError("approverName");
            }}
            error={fieldErrors.approverName}
            placeholder="e.g. Security Officer"
            disabled={isPending}
          />
        </div>

        {/* Global error */}
        {globalError && (
          <div className="animate-shake border border-error/30 bg-error/10 p-4 pixel-corner">
            <p className="font-mono text-sm text-error">
              [ERROR] {globalError}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="primary"
            type="submit"
            disabled={isPending}
            className="border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 text-secondary-fixed-dim hover:bg-secondary-fixed-dim/15 focus:ring-secondary-fixed-dim/30"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-secondary-fixed-dim/30 border-t-secondary-fixed-dim" />
                Processing…
              </span>
            ) : (
              "EXECUTE TARGET_CREATION"
            )}
          </Button>
          {isPending && (
            <span className="font-mono text-sm text-on-surface-variant">
              Submitting to Convex…
            </span>
          )}
        </div>
      </form>
    </FormCard>
  );
}
