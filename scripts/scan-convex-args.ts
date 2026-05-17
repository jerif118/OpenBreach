import { readFile } from "node:fs/promises";
import municipalities from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import { scanWebsite } from "../src/scanner/passive.ts";
import { toRawScanPersistenceArgs } from "../src/scanner/persistence.ts";
import {
  municipalitySchema,
  rawScanEvidenceSchema,
  scanConvexEnvironmentSchema,
  type RawScanEvidence,
} from "../src/shared/contracts.ts";

// stdout is reserved for the JSON payload that `convex run` consumes via
// command substitution. All progress/diagnostic output must go to stderr.
const log = (message: string) => {
  process.stderr.write(`${message}\n`);
};

const environment = readEnvironment();

const allRecords = municipalitySchema.array().parse(municipalities);
const idFilter = environment.municipalityIds;
const records =
  idFilter.length === 0
    ? allRecords
    : allRecords.filter((m) => idFilter.includes(m.id));

if (idFilter.length > 0 && records.length === 0) {
  log(`No municipalities matched MUNICIPALITY_IDS=${idFilter.join(",")}.`);
  process.exit(1);
}

let results: RawScanEvidence[];

if (environment.fromFixture) {
  log(`Loading scan results from fixture file: ${environment.fixturePath}`);
  const parsed = rawScanEvidenceSchema
    .array()
    .parse(JSON.parse(await readFile(environment.fixturePath, "utf8")));

  if (idFilter.length === 0) {
    results = parsed;
  } else {
    const allowedIds = new Set(records.map((m) => m.id));
    results = parsed.filter((r) => allowedIds.has(r.municipalityId));
  }

  log(
    `Loaded ${results.length} fixture scan result${results.length === 1 ? "" : "s"}.`,
  );
} else {
  log(
    `Running live passive scan against ${records.length} municipalit${
      records.length === 1 ? "y" : "ies"
    } (concurrency=${environment.concurrency}, timeoutMs=${environment.controls.timeoutMs}, retries=${environment.controls.retries}).`,
  );
  log(
    "Set SCAN_FROM_FIXTURE=1 to skip the network and reuse data/scans/latest.scan-results.json.",
  );

  results = await runWithConcurrency(
    records,
    environment.concurrency,
    async (municipality, index) => {
      const startedAt = Date.now();
      const result = await scanWebsite(municipality, {
        source: "convex",
        controls: environment.controls,
      });
      const elapsedMs = Date.now() - startedAt;
      log(
        `[${index + 1}/${records.length}] ${municipality.id} ${describeOutcome(result)} in ${elapsedMs}ms`,
      );
      return result;
    },
  );

  const reachableCount = results.filter((r) => r.reachable).length;
  log(`Live scan complete: ${reachableCount}/${results.length} reachable.`);
}

process.stdout.write(JSON.stringify(toRawScanPersistenceArgs(results)));

function readEnvironment() {
  return scanConvexEnvironmentSchema.parse({
    fromFixture: process.env.SCAN_FROM_FIXTURE === "1",
    fixturePath:
      process.env.SCAN_FIXTURE_PATH ?? "data/scans/latest.scan-results.json",
    municipalityIds: (process.env.MUNICIPALITY_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    concurrency: Number(process.env.SCAN_CONCURRENCY ?? "5"),
    controls: {
      timeoutMs: Number(process.env.SCAN_TIMEOUT_MS ?? "5000"),
      retries: Number(process.env.SCAN_RETRIES ?? "1"),
      delayMs: Number(process.env.SCAN_DELAY_MS ?? "250"),
    },
  });
}

function describeOutcome(result: RawScanEvidence): string {
  if (result.reachable) {
    return `reachable (HTTP ${result.httpStatus ?? "?"})`;
  }
  const firstError = result.errors[0]?.message;
  return firstError ? `unreachable: ${firstError}` : "unreachable";
}

async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      out[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);
  return out;
}
