import { z } from "zod";
import {
  approvalGateSchema,
  auditEventSchema,
  authorizationScopeSchema,
  targetProfileSchema,
  validationClassSchema,
  workflowRunSchema,
  type ValidationClass,
} from "../../shared/contracts.ts";
import {
  normalizeUrlCandidate,
  isPrivateOrInternalHost,
  isWithinCanonicalScope,
  normalizeHostname,
  createTargetId,
  capitalize,
  toDateTimeLocalInput,
  fromDateTimeLocalInput,
  parseAssetList,
  dedupeStrings,
} from "./intake-validation-utils.ts";

const TARGET_POLICY_DENIED_ACTIONS = [
  "Login attempts",
  "Credential stuffing or brute force",
  "Payload injection",
  "Fuzzing",
  "Private-network scanning",
  "Destructive requests",
] as const;

const SEMIACTIVE_ALLOWED_ACTIONS = [
  "Passive metadata collection",
  "TLS and header review",
  "Safe HEAD/GET reachability checks on explicitly allowed URLs",
] as const;

const CONTROLLED_ALLOWED_ACTIONS = [
  ...SEMIACTIVE_ALLOWED_ACTIONS,
  "Controlled hypothesis validation inside the approved time window",
] as const;

const KNOWN_PUBLIC_TARGETS = {
  "merida.gob.mx": {
    classification: "public-sector" as const,
    geography: {
      country: "Mexico",
      region: "Yucatan",
      city: "Merida",
    },
    population: 995129,
    riskTier: "medium" as const,
  },
} as const;

const TARGET_INTAKE_SCOPE_TYPES = {
  passive: "passive-only",
  semiactive: "limited",
  controlled_validation: "time-bound",
} as const;

const targetIntakeTimeWindowSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endAt) <= new Date(value.startAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Test window end must be after the start time.",
        path: ["endAt"],
      });
    }
  });

export const targetIntakeDraftSchema = z.object({
  organizationName: z.string().min(1),
  canonicalUrl: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  allowedAssets: z.array(z.string().min(1)).min(1),
  deniedAssets: z.array(z.string().min(1)).default([]),
  validationLevel: validationClassSchema.default("passive"),
  testWindow: targetIntakeTimeWindowSchema,
  rateLimitRpm: z.number().int().min(1).max(240),
  approverName: z.string().min(1),
  submittedBy: z.string().min(1),
});

export type TargetIntakeDraft = z.infer<typeof targetIntakeDraftSchema>;

export type TargetIntakeFormState = {
  organizationName: string;
  canonicalUrl: string;
  ownerName: string;
  ownerEmail: string;
  allowedAssetsText: string;
  deniedAssetsText: string;
  validationLevel: ValidationClass;
  testWindowStart: string;
  testWindowEnd: string;
  rateLimitRpm: string;
  approverName: string;
  submittedBy: string;
};

const targetIntakeFieldErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
});

const targetIntakeNormalizationSchema = z.object({
  canonicalUrl: z.string().url(),
  canonicalHost: z.string().min(1),
  allowedAssets: z.array(z.string().url()).min(1),
  deniedAssets: z.array(z.string().url()),
});

const targetIntakeEvaluationBaseSchema = z.object({
  state: z.enum(["form-invalid", "rejected", "approved"]),
  fieldErrors: z.array(targetIntakeFieldErrorSchema),
  reasons: z.array(z.string().min(1)),
  normalized: targetIntakeNormalizationSchema.nullable(),
  targetProfile: targetProfileSchema.nullable(),
  authorizationScope: authorizationScopeSchema.nullable(),
  workflowRun: workflowRunSchema.nullable(),
  intakeGate: approvalGateSchema.nullable(),
  auditEvents: z.array(auditEventSchema),
  nextStep: z.string().min(1),
  networkActivityTriggered: z.literal(false),
});

export type TargetIntakeEvaluation = z.infer<
  typeof targetIntakeEvaluationBaseSchema
>;

export const targetIntakeSubmissionSchema = z.object({
  id: z.string().min(1),
  submittedAt: z.string().datetime(),
  draft: targetIntakeDraftSchema,
  evaluation: targetIntakeEvaluationBaseSchema,
});

export const targetIntakeSubmissionListSchema = z.array(
  targetIntakeSubmissionSchema,
);

export type TargetIntakeSubmission = z.infer<
  typeof targetIntakeSubmissionSchema
>;

export const approvedTargetIntakeFixture: TargetIntakeDraft = {
  organizationName: "Municipio de Merida",
  canonicalUrl: "https://merida.gob.mx",
  ownerName: "Municipal Digital Services",
  ownerEmail: "seguridad.digital@merida.gob.mx",
  allowedAssets: [
    "https://merida.gob.mx",
    "https://www.merida.gob.mx",
    "https://transparencia.merida.gob.mx",
  ],
  deniedAssets: [
    "https://intranet.merida.gob.mx",
    "https://admin.merida.gob.mx",
  ],
  validationLevel: "passive",
  testWindow: {
    startAt: "2026-05-16T15:00:00.000Z",
    endAt: "2026-05-16T19:00:00.000Z",
  },
  rateLimitRpm: 24,
  approverName: "City Program Owner",
  submittedBy: "operator-demo",
};

export const rejectedTargetIntakeFixture: TargetIntakeDraft = {
  organizationName: "Municipio de Merida",
  canonicalUrl: "https://merida.gob.mx",
  ownerName: "Municipal Digital Services",
  ownerEmail: "seguridad.digital@merida.gob.mx",
  allowedAssets: ["https://merida.gob.mx", "https://vpn.partner-example.org"],
  deniedAssets: ["https://10.20.30.40"],
  validationLevel: "controlled_validation",
  testWindow: {
    startAt: "2026-05-17T01:00:00.000Z",
    endAt: "2026-05-17T05:00:00.000Z",
  },
  rateLimitRpm: 60,
  approverName: "City Program Owner",
  submittedBy: "operator-demo",
};

export function draftToFormState(
  draft: TargetIntakeDraft,
): TargetIntakeFormState {
  return {
    organizationName: draft.organizationName,
    canonicalUrl: draft.canonicalUrl,
    ownerName: draft.ownerName,
    ownerEmail: draft.ownerEmail,
    allowedAssetsText: draft.allowedAssets.join("\n"),
    deniedAssetsText: draft.deniedAssets.join("\n"),
    validationLevel: draft.validationLevel,
    testWindowStart: toDateTimeLocalInput(draft.testWindow.startAt),
    testWindowEnd: toDateTimeLocalInput(draft.testWindow.endAt),
    rateLimitRpm: String(draft.rateLimitRpm),
    approverName: draft.approverName,
    submittedBy: draft.submittedBy,
  };
}

export function evaluateTargetIntakeForm(
  formState: TargetIntakeFormState,
  nowIso = new Date().toISOString(),
): TargetIntakeEvaluation {
  const parsedDraft = parseTargetIntakeDraft(formState);
  if (!parsedDraft.success) {
    return targetIntakeEvaluationBaseSchema.parse({
      state: "form-invalid",
      fieldErrors: parsedDraft.error.issues.map((issue) => ({
        field: issue.path.join(".") || "form",
        message: issue.message,
      })),
      reasons: [
        "Complete the intake fields to generate a safe authorization scope.",
      ],
      normalized: null,
      targetProfile: null,
      authorizationScope: null,
      workflowRun: null,
      intakeGate: null,
      auditEvents: [],
      nextStep: "Fix the missing or invalid intake fields before continuing.",
      networkActivityTriggered: false,
    });
  }

  return buildTargetIntakeEvaluation(parsedDraft.data, nowIso);
}

export function parseTargetIntakeDraft(formState: TargetIntakeFormState) {
  return targetIntakeDraftSchema.safeParse({
    organizationName: formState.organizationName.trim(),
    canonicalUrl: formState.canonicalUrl.trim(),
    ownerName: formState.ownerName.trim(),
    ownerEmail: formState.ownerEmail.trim(),
    allowedAssets: parseAssetList(formState.allowedAssetsText),
    deniedAssets: parseAssetList(formState.deniedAssetsText),
    validationLevel: formState.validationLevel,
    testWindow: {
      startAt: fromDateTimeLocalInput(formState.testWindowStart),
      endAt: fromDateTimeLocalInput(formState.testWindowEnd),
    },
    rateLimitRpm: Number(formState.rateLimitRpm),
    approverName: formState.approverName.trim(),
    submittedBy: formState.submittedBy.trim(),
  });
}

export function getSafetyModelCards() {
  return [
    {
      level: "passive" as const,
      title: "Passive",
      detail:
        "Metadata, TLS, headers, DNS, and public page collection only. No active validation.",
    },
    {
      level: "semiactive" as const,
      title: "Semiactive",
      detail:
        "Safe HEAD/GET verification on explicitly allowed assets. Still no payloads, fuzzing, or login attempts.",
    },
    {
      level: "controlled_validation" as const,
      title: "Controlled Validation",
      detail:
        "Hypothesis checks are time-bound and require a separate approval gate before execution.",
    },
  ];
}

function buildTargetIntakeEvaluation(
  draft: TargetIntakeDraft,
  nowIso: string,
): TargetIntakeEvaluation {
  const normalizedCanonicalUrl = normalizeUrlCandidate(draft.canonicalUrl);
  const reasons: string[] = [];

  if (!normalizedCanonicalUrl) {
    reasons.push("Canonical URL must be a valid public HTTPS URL.");
  }

  const canonicalHost = normalizedCanonicalUrl
    ? normalizeHostname(new URL(normalizedCanonicalUrl).hostname)
    : "";

  if (canonicalHost && isPrivateOrInternalHost(canonicalHost)) {
    reasons.push("Canonical URL must point to a public internet host.");
  }

  const normalizedAllowedAssets = normalizeAssetCollection(
    draft.allowedAssets,
    canonicalHost,
    "allowed",
    reasons,
  );
  const normalizedDeniedAssets = normalizeAssetCollection(
    draft.deniedAssets,
    canonicalHost,
    "denied",
    reasons,
  );

  if (normalizedAllowedAssets.length === 0) {
    reasons.push("At least one allowed asset must remain after normalization.");
  }

  if (
    normalizedAllowedAssets.length > 0 &&
    normalizedAllowedAssets.every((asset) =>
      normalizedDeniedAssets.includes(asset),
    )
  ) {
    reasons.push(
      "Denied assets remove every approved public asset; no safe scope remains.",
    );
  }

  const targetProfile = normalizedCanonicalUrl
    ? buildTargetProfile(draft, normalizedCanonicalUrl)
    : null;

  const targetId =
    targetProfile?.targetId ?? createTargetId(draft, canonicalHost);
  const intakeGateBase = {
    gateId: `gate-${targetId}-intake`,
    targetId,
    gateType: "intake" as const,
    requestedAt: nowIso,
    requestedBy: draft.submittedBy,
  };

  const auditEvents: z.infer<typeof auditEventSchema>[] = [];

  if (targetProfile) {
    auditEvents.push(
      auditEventSchema.parse({
        eventId: `event-${targetId}-target-created`,
        targetId,
        eventType: "target-created",
        actor: draft.submittedBy,
        timestamp: nowIso,
        details: {
          canonicalUrl: targetProfile.primaryUrl,
          ownerEmail: draft.ownerEmail,
        },
      }),
    );
  }

  if (reasons.length > 0) {
    const workflowRun = workflowRunSchema.parse({
      runId: `run-${targetId}`,
      targetId,
      status: "rejected",
      startedAt: nowIso,
      abortedAt: nowIso,
      abortedReason: reasons.join(" "),
      currentPhase: "intake",
      phases: [
        {
          phase: "intake",
          enteredAt: nowIso,
          exitedAt: nowIso,
          rejectionReason: reasons.join(" "),
        },
      ],
    });

    const intakeGate = approvalGateSchema.parse({
      ...intakeGateBase,
      status: "rejected",
      rejectionReason: reasons.join(" "),
      runId: workflowRun.runId,
    });

    auditEvents.push(
      auditEventSchema.parse({
        eventId: `event-${targetId}-gate-rejected`,
        targetId,
        eventType: "gate-rejected",
        actor: draft.approverName,
        timestamp: nowIso,
        runId: workflowRun.runId,
        details: {
          reasons,
          canonicalUrl: draft.canonicalUrl,
        },
      }),
    );
    auditEvents.push(
      auditEventSchema.parse({
        eventId: `event-${targetId}-target-rejected`,
        targetId,
        eventType: "target-rejected",
        actor: draft.approverName,
        timestamp: nowIso,
        runId: workflowRun.runId,
        details: {
          deniedAssets: normalizedDeniedAssets,
          allowedAssets: normalizedAllowedAssets,
        },
      }),
    );

    return targetIntakeEvaluationBaseSchema.parse({
      state: "rejected",
      fieldErrors: [],
      reasons,
      normalized: normalizedCanonicalUrl
        ? {
            canonicalUrl: normalizedCanonicalUrl,
            canonicalHost,
            allowedAssets: normalizedAllowedAssets,
            deniedAssets: normalizedDeniedAssets,
          }
        : null,
      targetProfile,
      authorizationScope: null,
      workflowRun,
      intakeGate,
      auditEvents,
      nextStep:
        "Rejected before any scan or orchestrator work. Fix the out-of-scope assets and resubmit.",
      networkActivityTriggered: false,
    });
  }

  const authorizationScope = authorizationScopeSchema.parse(
    buildAuthorizationScope(
      draft,
      targetId,
      normalizedCanonicalUrl!,
      normalizedAllowedAssets,
      normalizedDeniedAssets,
      nowIso,
    ),
  );

  const workflowRun = workflowRunSchema.parse({
    runId: `run-${targetId}`,
    targetId,
    status: "pending",
    startedAt: nowIso,
    currentPhase: "intake",
    phases: [
      {
        phase: "intake",
        enteredAt: nowIso,
      },
    ],
  });

  const intakeGate = approvalGateSchema.parse({
    ...intakeGateBase,
    status: "approved",
    approvedBy: draft.approverName,
    approvedAt: nowIso,
    runId: workflowRun.runId,
  });

  auditEvents.push(
    auditEventSchema.parse({
      eventId: `event-${targetId}-gate-approved`,
      targetId,
      eventType: "gate-approved",
      actor: draft.approverName,
      timestamp: nowIso,
      runId: workflowRun.runId,
      details: {
        validationLevel: draft.validationLevel,
        rateLimitRpm: draft.rateLimitRpm,
      },
    }),
  );
  auditEvents.push(
    auditEventSchema.parse({
      eventId: `event-${targetId}-auth-granted`,
      targetId,
      eventType: "auth-granted",
      actor: draft.approverName,
      timestamp: nowIso,
      runId: workflowRun.runId,
      details: {
        scopeType: authorizationScope.scopeType,
        allowedAssets: authorizationScope.allowedAssets,
        deniedAssets: authorizationScope.deniedAssets,
      },
    }),
  );
  auditEvents.push(
    auditEventSchema.parse({
      eventId: `event-${targetId}-workflow-started`,
      targetId,
      eventType: "workflow-started",
      actor: draft.submittedBy,
      timestamp: nowIso,
      runId: workflowRun.runId,
      details: {
        nextStep: getNextStep(draft.validationLevel),
      },
    }),
  );

  return targetIntakeEvaluationBaseSchema.parse({
    state: "approved",
    fieldErrors: [],
    reasons: [],
    normalized: {
      canonicalUrl: normalizedCanonicalUrl!,
      canonicalHost,
      allowedAssets: normalizedAllowedAssets,
      deniedAssets: normalizedDeniedAssets,
    },
    targetProfile,
    authorizationScope,
    workflowRun,
    intakeGate,
    auditEvents,
    nextStep: getNextStep(draft.validationLevel),
    networkActivityTriggered: false,
  });
}

function buildAuthorizationScope(
  draft: TargetIntakeDraft,
  targetId: string,
  normalizedCanonicalUrl: string,
  allowedAssets: string[],
  deniedAssets: string[],
  nowIso: string,
) {
  const allowedValidationClasses = getAllowedValidationClasses(
    draft.validationLevel,
  );
  const scopeType = TARGET_INTAKE_SCOPE_TYPES[draft.validationLevel];
  const approvalRequired = draft.validationLevel === "controlled_validation";

  return {
    authorizationId: `auth-${targetId}`,
    targetId,
    scopeType,
    grantedBy: draft.approverName,
    grantedAt: nowIso,
    expiresAt: scopeType === "time-bound" ? draft.testWindow.endAt : undefined,
    allowedAssets,
    deniedAssets,
    allowedValidationClasses,
    allowedActions: getAllowedActions(draft.validationLevel),
    deniedActions: getDeniedActions(draft.validationLevel),
    rateLimit: {
      requestsPerMinute: draft.rateLimitRpm,
    },
    approvalRequirement: {
      required: approvalRequired,
      approverName: approvalRequired ? draft.approverName : undefined,
      rationale: approvalRequired
        ? "Controlled validation stays blocked until an execution gate is approved."
        : "Passive and semiactive review remain bounded by the intake gate.",
    },
    testWindow: draft.testWindow,
    constraints: [
      `Owner contact: ${draft.ownerName} <${draft.ownerEmail}>`,
      `Submitted by: ${draft.submittedBy}`,
    ],
    evidenceUrl: normalizedCanonicalUrl,
  };
}

function buildTargetProfile(
  draft: TargetIntakeDraft,
  normalizedCanonicalUrl: string,
) {
  const url = new URL(normalizedCanonicalUrl);
  const canonicalHost = normalizeHostname(url.hostname);
  const knownProfile =
    KNOWN_PUBLIC_TARGETS[canonicalHost as keyof typeof KNOWN_PUBLIC_TARGETS];

  return targetProfileSchema.parse({
    targetId: createTargetId(draft, canonicalHost),
    name: draft.organizationName,
    primaryUrl: normalizedCanonicalUrl,
    riskTier:
      knownProfile?.riskTier ??
      getRiskTierForValidationLevel(draft.validationLevel),
    classification: knownProfile?.classification ?? "other",
    parentOrganization: draft.organizationName,
    geography: knownProfile?.geography,
    population: knownProfile?.population,
    metadata: {
      canonicalHost,
      ownerName: draft.ownerName,
      ownerEmail: draft.ownerEmail,
      validationLevel: draft.validationLevel,
    },
  });
}

function normalizeAssetCollection(
  assets: string[],
  canonicalHost: string,
  label: "allowed" | "denied",
  reasons: string[],
) {
  const normalizedAssets = dedupeStrings(
    assets
      .map((asset) => {
        const normalizedAsset = normalizeUrlCandidate(asset);
        if (!normalizedAsset) {
          reasons.push(
            `${capitalize(label)} asset '${asset}' is not a valid HTTPS URL.`,
          );
          return null;
        }

        const assetHost = normalizeHostname(new URL(normalizedAsset).hostname);
        if (isPrivateOrInternalHost(assetHost)) {
          reasons.push(
            `${capitalize(label)} asset '${asset}' points to a private or internal host.`,
          );
          return null;
        }

        if (
          canonicalHost &&
          !isWithinCanonicalScope(assetHost, canonicalHost)
        ) {
          reasons.push(
            `${capitalize(label)} asset '${asset}' is outside the canonical scope '${canonicalHost}'.`,
          );
          return null;
        }

        return normalizedAsset;
      })
      .filter((asset): asset is string => Boolean(asset)),
  );

  return normalizedAssets;
}

function getAllowedValidationClasses(
  validationLevel: ValidationClass,
): ValidationClass[] {
  if (validationLevel === "passive") {
    return ["passive"];
  }

  if (validationLevel === "semiactive") {
    return ["passive", "semiactive"];
  }

  return ["passive", "semiactive", "controlled_validation"];
}

function getAllowedActions(validationLevel: ValidationClass) {
  if (validationLevel === "passive") {
    return [
      "Passive metadata collection",
      "TLS and security header review",
      "Public DNS, WHOIS, and certificate analysis",
    ];
  }

  if (validationLevel === "semiactive") {
    return [...SEMIACTIVE_ALLOWED_ACTIONS];
  }

  return [...CONTROLLED_ALLOWED_ACTIONS];
}

function getDeniedActions(validationLevel: ValidationClass) {
  if (validationLevel === "passive") {
    return [
      ...TARGET_POLICY_DENIED_ACTIONS,
      "Authenticated access",
      "Session manipulation",
    ];
  }

  if (validationLevel === "semiactive") {
    return [...TARGET_POLICY_DENIED_ACTIONS];
  }

  return [...TARGET_POLICY_DENIED_ACTIONS];
}

function getRiskTierForValidationLevel(validationLevel: ValidationClass) {
  if (validationLevel === "controlled_validation") {
    return "high" as const;
  }

  if (validationLevel === "semiactive") {
    return "medium" as const;
  }

  return "low" as const;
}

function getNextStep(validationLevel: ValidationClass) {
  if (validationLevel === "controlled_validation") {
    return "Execution remains blocked until a separate controlled-validation approval gate is approved.";
  }

  if (validationLevel === "semiactive") {
    return "Scope is ready for semiactive review, but no validation or scan has started from this screen.";
  }

  return "Scope is ready for passive orchestrator handoff; no scan has started from this screen.";
}
