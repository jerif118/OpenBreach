/**
 * Shared per-target orchestration logic used by both:
 *   - The CLI script `scripts/orchestrate-municipality.ts` (`pnpm orchestrate:run`).
 *   - The Convex Node action `convex/orchestratorActions.ts` (UI-triggered runs).
 *
 * It does NOT persist anything to Convex; it only:
 *   1. Synthesizes hypotheses + authorization scope from a pipeline entry.
 *   2. Drives `runMvpOrchestrator` to an approved TestPlan / ExecutionGate.
 *   3. Performs the bounded controlled-validation HTTP probe.
 *   4. Returns the fully-assembled persistence artifact + a small outcome
 *      summary the caller can log / surface in the UI.
 *
 * Persistence (the `workflow:persistOrchestratorRun` internal mutation) is the
 * caller's responsibility so the same logic works in Node-script land
 * (spawnSync convex run) and Convex action land (ctx.runMutation).
 */

import { runControlledValidation } from "./controlled-validation-runner.ts";
import { runMvpOrchestrator } from "./mvp-orchestrator.ts";
import type {
  AuthorizationScope,
  VulnerabilityHypothesis,
} from "../shared/contracts.ts";

export type OrchestratorSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type OrchestratorScanFinding = {
  id: string;
  category:
    | "tls"
    | "headers"
    | "cms"
    | "exposure"
    | "admin-exposure"
    | "availability"
    | "known-vulnerability";
  severity: OrchestratorSeverity;
  title: string;
  description: string;
  evidence: string;
  remediationHint: string;
};

export type OrchestratorPipelineEntry = {
  municipality: {
    id: string;
    name: string;
    state: string;
    websiteUrl: string;
    population: number | null;
    latitude: number | null;
    longitude: number | null;
    sourceUrl: string | null;
    riskTier: "low" | "medium" | "high" | "critical";
  };
  scan:
    | (Record<string, unknown> & {
        id: string;
        scannedAt: string;
        requestedUrl?: string;
        finalUrl?: string;
        reachable?: boolean;
        httpStatus?: number;
        headers?: Record<string, string>;
        findings: OrchestratorScanFinding[];
      })
    | null;
};

export type OrchestratorRunOptions = {
  actor: string;
  /** ISO timestamp; defaults to new Date().toISOString() */
  now?: string;
  /** Authorization scope TTL in milliseconds; defaults to 24h. */
  scopeTtlMs?: number;
  /** Optional fetch override (used by tests). */
  fetchImpl?: typeof fetch;
};

type PersistFindingStatus =
  | "observed"
  | "confirmed"
  | "likely"
  | "skipped"
  | "unresolved"
  | "false-positive";

type PersistFindingCategory =
  | "tls"
  | "headers"
  | "cms"
  | "exposure"
  | "admin-exposure"
  | "availability"
  | "known-vulnerability"
  | "configuration"
  | "logic";

type PersistFinding = {
  findingId: string;
  targetId: string;
  title: string;
  description: string;
  severity: OrchestratorSeverity;
  status: PersistFindingStatus;
  createdAt: string;
  category?: PersistFindingCategory;
  evidence?: string;
  remediationHint?: string;
  affectedAssets?: string[];
  confidence?: "low" | "medium" | "high";
  cweId?: string;
  cvssScore?: number;
  validationResultId?: string;
  reportReady?: boolean;
  runId: string;
};

export type OrchestratorArtifact = Record<string, unknown>;

export type OrchestratorOutcome = {
  validationStatus: "passed" | "blocked" | "error" | "failed" | "inconclusive";
  requestCount: number;
  httpStatus: number | null;
  runId: string;
  targetId: string;
};

export type OrchestratorRunResult = {
  artifact: OrchestratorArtifact;
  outcome: OrchestratorOutcome;
};

const DEFAULT_SCOPE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_HYPOTHESES = 5;
const MAX_VALIDATION_REQUESTS = 2;
const VALIDATION_FETCH_TIMEOUT_MS = 5000;

/**
 * Run the deterministic state machine and bounded live probe for one pipeline
 * entry, returning the artifact ready to feed into `persistOrchestratorRun`.
 *
 * Throws if the entry has no scan or no usable validation URL — both of which
 * are user-actionable preconditions the caller should surface in the UI.
 */
export async function runOrchestratorForPipelineEntry(
  entry: OrchestratorPipelineEntry,
  options: OrchestratorRunOptions,
): Promise<OrchestratorRunResult> {
  if (!entry.scan) {
    throw new Error(
      `Municipality ${entry.municipality.id} has no passive scan; run a scan before orchestrating.`,
    );
  }

  const scan = entry.scan;
  const municipality = entry.municipality;
  const targetId = municipality.id;
  const now = options.now ?? new Date().toISOString();
  const ttl = options.scopeTtlMs ?? DEFAULT_SCOPE_TTL_MS;
  const expiresAt = new Date(Date.parse(now) + ttl).toISOString();
  const runId = `run-${targetId}-${Date.now().toString(36)}`;
  const actor = options.actor;

  const validationUrl = pickValidationUrl(scan, municipality.websiteUrl);
  if (!validationUrl) {
    throw new Error(
      `No usable validation URL for ${targetId} (scan.finalUrl, scan.requestedUrl, and websiteUrl are all unusable).`,
    );
  }
  const origin = new URL(validationUrl).origin;

  const hypotheses: VulnerabilityHypothesis[] = scan.findings
    .filter((f) => f.severity !== "info")
    .slice(0, MAX_HYPOTHESES)
    .map((finding, idx) => ({
      hypothesisId: `${runId}-hyp-${idx + 1}`,
      targetId,
      title: finding.title,
      status: "approved" as const,
      createdAt: now,
      proposedBy: "openbreach-orchestrator",
      description: finding.description,
      affectedComponents: [origin],
      runId,
      metadata: {
        sourceFindingId: finding.id,
        category: finding.category,
        severity: finding.severity,
      },
    }));

  const authorizationScope: AuthorizationScope = {
    authorizationId: `${runId}-auth`,
    targetId,
    scopeType: "time-bound",
    grantedBy: actor,
    grantedAt: now,
    expiresAt,
    constraints: [`allowed_origin:${origin}`],
    evidenceUrl: origin,
  };

  const orchestratorResult = runMvpOrchestrator({
    targetId,
    runId,
    actor,
    now,
    scopeApproved: true,
    passiveEvidenceComplete: true,
    fingerprintingComplete: true,
    hypothesesReady: hypotheses.length > 0,
    hypotheses,
    requestActiveValidation: true,
    executionGateApproved: true,
  });

  if (!orchestratorResult.testPlan || !orchestratorResult.approvalGate) {
    throw new Error(
      `Orchestrator did not produce testPlan/approvalGate; mvpState=${orchestratorResult.mvpState}`,
    );
  }

  const testPlan = {
    ...orchestratorResult.testPlan,
    metadata: {
      ...(orchestratorResult.testPlan.metadata as
        | Record<string, unknown>
        | undefined),
      maxRequestsTotal: MAX_VALIDATION_REQUESTS,
      fetchTimeoutMs: VALIDATION_FETCH_TIMEOUT_MS,
      allowedActions: ["HEAD", "GET"],
    },
  };

  const validationRun = await runControlledValidation({
    targetId,
    runId,
    actor,
    now,
    authorizationScope,
    testPlan,
    approvalGate: orchestratorResult.approvalGate,
    validationBaseUrl: validationUrl,
    allowedOrigins: [origin],
    fetchImpl: options.fetchImpl ?? enrichedFetch,
  });

  const validationResult = validationRun.validationResult;
  const isPassed = validationResult.status === "passed";

  const findings = buildFindings({
    targetId,
    runId,
    now,
    scanFindings: scan.findings,
    validationResultId: isPassed ? validationResult.resultId : undefined,
  });

  if (isPassed) {
    findings.push({
      findingId: `${runId}-live-probe`,
      targetId,
      title: "Live validation: HTTP read confirmed exposure surface",
      description: `OpenBreach controlled validation completed ${validationRun.requestCount} authorized request(s) against ${origin}. Response metadata captured without payload introspection.`,
      severity: "info",
      status: "confirmed",
      createdAt: now,
      category: "configuration",
      evidence: JSON.stringify({
        url: validationUrl,
        requestCount: validationRun.requestCount,
        metadata: validationResult.metadata,
      }),
      remediationHint:
        "Review the captured response metadata against the bounded test plan and authorization scope.",
      affectedAssets: [origin],
      confidence: "high",
      validationResultId: validationResult.resultId,
      reportReady: false,
      runId,
    });
  }

  const auditEvents = [
    ...orchestratorResult.auditEvents,
    ...validationRun.auditTrail,
  ];

  const passiveEvidence = scan.requestedUrl
    ? {
        evidenceId: `${runId}-passive-${scan.id}`,
        source: "convex",
        collectedAt: scan.scannedAt,
        requestedUrl: scan.requestedUrl,
        reachable: scan.reachable ?? false,
        finalUrl: scan.finalUrl,
        httpStatus: scan.httpStatus,
        headers: scan.headers,
        runId,
        envelopeSource: "system",
        envelopeRecordedAt: now,
        envelopeHash: validationRun.evidenceEnvelope.hash ?? "n/a",
        envelopeCollectedBy: actor,
      }
    : undefined;

  const artifact: OrchestratorArtifact = {
    municipalityExternalId: municipality.id,
    targetId,
    runId,
    actor,
    now,
    authorizationScope,
    workflowRun: orchestratorResult.workflowRun,
    testPlan,
    approvalGate: orchestratorResult.approvalGate,
    hypotheses,
    validationResult,
    findings,
    passiveEvidence,
    auditEvents,
  };

  const httpStatus =
    typeof validationResult.metadata?.httpStatus === "number"
      ? validationResult.metadata.httpStatus
      : null;

  return {
    artifact,
    outcome: {
      validationStatus: validationResult.status,
      requestCount: validationRun.requestCount,
      httpStatus,
      runId,
      targetId,
    },
  };
}

function pickValidationUrl(
  scan: OrchestratorPipelineEntry["scan"],
  websiteUrl: string,
): string | null {
  const candidate = scan?.finalUrl ?? scan?.requestedUrl ?? websiteUrl;
  if (!candidate) {
    return null;
  }
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function buildFindings(args: {
  targetId: string;
  runId: string;
  now: string;
  scanFindings: OrchestratorScanFinding[];
  validationResultId?: string;
}): PersistFinding[] {
  return args.scanFindings.map((finding, idx) => ({
    findingId: `${args.runId}-finding-${idx + 1}-${finding.id}`,
    targetId: args.targetId,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    status: args.validationResultId ? "confirmed" : "observed",
    createdAt: args.now,
    category: finding.category,
    evidence: finding.evidence,
    remediationHint: finding.remediationHint,
    confidence: "medium",
    validationResultId: args.validationResultId,
    reportReady: finding.severity === "critical" ? true : undefined,
    runId: args.runId,
  }));
}

// Surface the underlying cause code (e.g. ENOTFOUND, ECONNREFUSED) in the
// error message so operators can triage failed live probes from the UI.
async function enrichedFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): ReturnType<typeof fetch> {
  try {
    return await globalThis.fetch(input, init);
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeCode =
      cause && typeof cause === "object" && "code" in cause
        ? String((cause as { code: unknown }).code)
        : undefined;
    const causeMessage = cause instanceof Error ? cause.message : undefined;
    const baseMessage = error instanceof Error ? error.message : String(error);
    const message =
      (causeCode ?? causeMessage)
        ? `${baseMessage} [${causeCode ?? causeMessage}]`
        : baseMessage;
    throw new Error(message);
  }
}
