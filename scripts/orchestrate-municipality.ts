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

import {
  runOrchestratorForPipelineEntry,
  type OrchestratorPipelineEntry,
} from "../src/workflow/orchestrator-runner.ts";

type CliOptions = {
  externalIds: string[];
  all: boolean;
  limit: number;
  delayMs: number;
};

type PipelineEntry = OrchestratorPipelineEntry;

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
    throw new Error(`Failed to spawn convex run: ${result.error.message}`);
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
  const { artifact, outcome } = await runOrchestratorForPipelineEntry(entry, {
    actor: "demo-operator",
  });
  persistArtifact(artifact);
  return {
    validationStatus: outcome.validationStatus,
    requestCount: outcome.requestCount,
    httpStatus: outcome.httpStatus,
  };
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
