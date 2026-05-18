/**
 * End-to-end orchestrator runner for the OpenBreach MVP (issue #69 + #70).
 *
 * For each municipality in scope this script:
 *   1. Fetches the latest passive scan from Convex.
 *   2. Synthesizes VulnerabilityHypothesis records from the scan findings.
 *   3. Drives `runMvpOrchestrator` with `requestActiveValidation` +
 *      `executionGateApproved` so the deterministic state machine returns
 *      an approved TestPlan / ExecutionGate pair.
 *   4. Executes `runControlledValidation` against the municipality's
 *      primary URL. This is a *real, live* network call: two safe HTTP
 *      reads at most, allow-listed to the municipality origin only.
 *   5. Maps the ValidationResult + scan findings into pivot-table
 *      Finding records and persists everything (workflowRuns, testPlans,
 *      approvalGates, authorizationScopes, vulnerabilityHypotheses,
 *      validationResults, findings, passiveScanEvidence, auditEvents)
 *      via the internal `workflow:persistOrchestratorRun` mutation.
 *
 * Usage:
 *   pnpm orchestrate:run -- --municipality <externalId>
 *   pnpm orchestrate:run -- --all [--limit 50]
 *
 * Safety:
 *   - allowedOrigins is set to the municipality primaryUrl origin only.
 *   - testPlan metadata sets maxRequestsTotal=2, fetchTimeoutMs=5000.
 *   - Sequential per-target with a configurable inter-target delay.
 */

import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

import { runControlledValidation } from "../src/workflow/controlled-validation-runner.ts";
import { runMvpOrchestrator } from "../src/workflow/mvp-orchestrator.ts";
import type {
  AuthorizationScope,
  VulnerabilityHypothesis,
} from "../src/shared/contracts.ts";

type CliOptions = {
  externalIds: string[];
  all: boolean;
  limit: number;
  delayMs: number;
};

type Severity = "info" | "low" | "medium" | "high" | "critical";

type ScanFinding = {
  id: string;
  category:
    | "tls"
    | "headers"
    | "cms"
    | "exposure"
    | "admin-exposure"
    | "availability"
    | "known-vulnerability";
  severity: Severity;
  title: string;
  description: string;
  evidence: string;
  remediationHint: string;
};

type PipelineEntry = {
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
        findings: ScanFinding[];
      })
    | null;
};

main().catch((error) => {
  process.stderr.write(`orchestrate-municipality failed: ${error}\n`);
  process.exit(1);
});

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  process.stderr.write(
    `Loading pipeline entries from Convex (municipalities.listPipeline)...\n`,
  );
  const allEntries = readPipeline(options.limit);
  process.stderr.write(`Loaded ${allEntries.length} pipeline entries.\n`);

  const entries = selectEntries(allEntries, options);
  if (entries.length === 0) {
    process.stderr.write(
      `No matching pipeline entries (filter: ${
        options.all ? "all" : options.externalIds.join(",")
      }).\n`,
    );
    process.exit(2);
  }

  process.stderr.write(`Will orchestrate ${entries.length} target(s).\n`);

  let succeeded = 0;
  let blocked = 0;
  let errored = 0;

  for (const [index, entry] of entries.entries()) {
    const tag = `[${index + 1}/${entries.length}] ${entry.municipality.id}`;
    try {
      const outcome = await orchestrateOne(entry);
      process.stderr.write(
        `${tag} status=${outcome.validationStatus} requestCount=${outcome.requestCount} httpStatus=${
          outcome.httpStatus ?? "-"
        }\n`,
      );
      if (outcome.validationStatus === "passed") {
        succeeded += 1;
      } else if (outcome.validationStatus === "blocked") {
        blocked += 1;
      } else {
        errored += 1;
      }
    } catch (error) {
      errored += 1;
      process.stderr.write(
        `${tag} failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }

    if (index < entries.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  process.stderr.write(
    `Done. passed=${succeeded} blocked=${blocked} errored=${errored}\n`,
  );
}

function parseArgs(argv: string[]): CliOptions {
  const externalIds: string[] = [];
  let all = false;
  let limit = 50;
  let delayMs = 750;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--all":
        all = true;
        break;
      case "--municipality": {
        const value = argv[++i];
        if (!value) throw new Error("--municipality requires a value");
        externalIds.push(value);
        break;
      }
      case "--limit": {
        const value = Number(argv[++i]);
        if (!Number.isSafeInteger(value) || value < 1 || value > 200) {
          throw new Error("--limit must be a positive integer <= 200");
        }
        limit = value;
        break;
      }
      case "--delay-ms": {
        const value = Number(argv[++i]);
        if (!Number.isFinite(value) || value < 0) {
          throw new Error("--delay-ms must be >= 0");
        }
        delayMs = Math.floor(value);
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!all && externalIds.length === 0) {
    throw new Error(
      "Pass at least one --municipality <externalId>, or --all to orchestrate every municipality with a scan.",
    );
  }

  return { externalIds, all, limit, delayMs };
}

function readPipeline(limit: number): PipelineEntry[] {
  const result = spawnSync(
    "npx",
    ["convex", "run", "municipalities:listPipeline", JSON.stringify({ limit })],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  if (result.error) {
    throw new Error(
      `Failed to spawn convex run: ${result.error.message}`,
    );
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      `convex run municipalities:listPipeline failed with exit code ${result.status}`,
    );
  }

  const stdout = result.stdout?.trim() ?? "";
  if (!stdout) {
    throw new Error("convex run returned no output");
  }

  const jsonStart = stdout.indexOf("[");
  const jsonText = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      throw new Error("Expected an array from listPipeline");
    }
    return parsed as PipelineEntry[];
  } catch (error) {
    throw new Error(
      `Could not parse listPipeline output as JSON: ${
        error instanceof Error ? error.message : String(error)
      }\nOutput: ${stdout.slice(0, 200)}...`,
    );
  }
}

function selectEntries(
  all: PipelineEntry[],
  options: CliOptions,
): PipelineEntry[] {
  const withScans = all.filter((entry) => entry.scan !== null);
  if (options.all) {
    return withScans;
  }
  const wanted = new Set(options.externalIds);
  return withScans.filter((entry) => wanted.has(entry.municipality.id));
}

type Outcome = {
  validationStatus: "passed" | "blocked" | "error" | "failed" | "inconclusive";
  requestCount: number;
  httpStatus: number | null;
};

async function orchestrateOne(entry: PipelineEntry): Promise<Outcome> {
  const scan = entry.scan!;
  const municipality = entry.municipality;
  const targetId = municipality.id;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const runId = `run-${targetId}-${Date.now().toString(36)}`;
  const actor = "demo-operator";

  const validationUrl = pickValidationUrl(scan, municipality.websiteUrl);
  if (!validationUrl) {
    throw new Error(`No usable validation URL for ${targetId}`);
  }
  const origin = new URL(validationUrl).origin;

  const hypotheses: VulnerabilityHypothesis[] = scan.findings
    .filter((f) => f.severity !== "info")
    .slice(0, 5)
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
      maxRequestsTotal: 2,
      fetchTimeoutMs: 5000,
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
    fetchImpl: enrichedFetch,
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
    const liveProbeFinding: PersistFinding = {
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
    };
    findings.push(liveProbeFinding);
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

  const artifact = {
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

  persistArtifact(artifact);

  const httpStatus =
    typeof validationResult.metadata?.httpStatus === "number"
      ? validationResult.metadata.httpStatus
      : null;

  return {
    validationStatus: validationResult.status,
    requestCount: validationRun.requestCount,
    httpStatus,
  };
}

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
    const causeMessage =
      cause instanceof Error ? cause.message : undefined;
    const baseMessage = error instanceof Error ? error.message : String(error);
    const message =
      causeCode ?? causeMessage
        ? `${baseMessage} [${causeCode ?? causeMessage}]`
        : baseMessage;
    throw new Error(message);
  }
}

function pickValidationUrl(
  scan: PipelineEntry["scan"],
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

type PersistFinding = {
  findingId: string;
  targetId: string;
  title: string;
  description: string;
  severity: Severity;
  status:
    | "observed"
    | "confirmed"
    | "likely"
    | "skipped"
    | "unresolved"
    | "false-positive";
  createdAt: string;
  category?:
    | "tls"
    | "headers"
    | "cms"
    | "exposure"
    | "admin-exposure"
    | "availability"
    | "known-vulnerability"
    | "configuration"
    | "logic";
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

function buildFindings(args: {
  targetId: string;
  runId: string;
  now: string;
  scanFindings: ScanFinding[];
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

function persistArtifact(artifact: Record<string, unknown>): void {
  const json = JSON.stringify({ artifact });
  if (json.length > 120_000) {
    throw new Error(
      `Artifact JSON is ${json.length} bytes; exceeds safe argv length. Reduce findings or hypotheses.`,
    );
  }

  const result = spawnSync(
    "npx",
    ["convex", "run", "workflow:persistOrchestratorRun", json],
    { stdio: ["ignore", "inherit", "inherit"] },
  );

  if (result.error) {
    throw new Error(`Failed to spawn convex run: ${result.error.message}`);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      `convex run workflow:persistOrchestratorRun failed with exit code ${result.status}`,
    );
  }
}
