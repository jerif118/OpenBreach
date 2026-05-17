import { readFile } from "node:fs/promises";
import municipalities from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import { scanWebsite } from "../src/scanner/passive.ts";
import { toRawScanPersistenceArgs } from "../src/scanner/persistence.ts";
import {
  municipalitySchema,
  rawScanEvidenceSchema,
  scanConvexEnvironmentSchema,
  type Municipality,
  type RawScanEvidence,
  type RawScanPersistenceArgs,
  type ScanConvexEnvironment,
} from "../src/shared/contracts.ts";

type MunicipalitySelection =
  | { ok: true; records: readonly Municipality[] }
  | { ok: false; idFilter: readonly string[] };

// stdout is reserved for the JSON payload that `convex run` consumes via
// command substitution. All progress/diagnostic output must go to stderr.
const log = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const environment = readEnvironment();

const allRecords = municipalitySchema.array().parse(municipalities);
const idFilter = environment.municipalityIds;
const municipalitySelection = selectMunicipalities(allRecords, idFilter);

if (!municipalitySelection.ok) {
  log(
    `No municipalities matched MUNICIPALITY_IDS=${municipalitySelection.idFilter.join(",")}.`,
  );
  process.exit(1);
}

const records = municipalitySelection.records;
const results = environment.fromFixture
  ? await loadFixtureResults(environment.fixturePath, idFilter, records)
  : await runLiveScan(records, environment);

const persistenceArgs: RawScanPersistenceArgs =
  toRawScanPersistenceArgs(results);
process.stdout.write(JSON.stringify(persistenceArgs));

function readEnvironment(): ScanConvexEnvironment {
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

function selectMunicipalities(
  records: readonly Municipality[],
  idFilter: readonly string[],
): MunicipalitySelection {
  const selected =
    idFilter.length === 0
      ? records
      : records.filter((m) => idFilter.includes(m.id));

  if (idFilter.length > 0 && selected.length === 0) {
    return { ok: false, idFilter };
  }

  return { ok: true, records: selected };
}

function filterFixtureResults(
  results: RawScanEvidence[],
  idFilter: readonly string[],
  records: readonly Municipality[],
): RawScanEvidence[] {
  if (idFilter.length === 0) {
    return results;
  }

  const allowedIds = new Set(records.map((m) => m.id));
  return results.filter((r) => allowedIds.has(r.municipalityId));
}

async function loadFixtureResults(
  fixturePath: string,
  idFilter: readonly string[],
  records: readonly Municipality[],
): Promise<RawScanEvidence[]> {
  log(`Loading scan results from fixture file: ${fixturePath}`);
  const parsed = rawScanEvidenceSchema
    .array()
    .parse(JSON.parse(await readFile(fixturePath, "utf8")));

  const results = filterFixtureResults(parsed, idFilter, records);

  log(
    `Loaded ${results.length} fixture scan result${results.length === 1 ? "" : "s"}.`,
  );

  return results;
}

async function runLiveScan(
  records: readonly Municipality[],
  environment: ScanConvexEnvironment,
): Promise<RawScanEvidence[]> {
  log(
    `Running live passive scan against ${records.length} municipalit${
      records.length === 1 ? "y" : "ies"
    } (concurrency=${environment.concurrency}, timeoutMs=${environment.controls.timeoutMs}, retries=${environment.controls.retries}).`,
  );
  log(
    "Set SCAN_FROM_FIXTURE=1 to skip the network and reuse data/scans/latest.scan-results.json.",
  );

  const results = await runWithConcurrency(
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

  return results;
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
  concurrency: ScanConvexEnvironment["concurrency"],
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
