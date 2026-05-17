import { spawnSync } from "node:child_process";
import {
  enrichedScanPersistenceArgsSchema,
  rawScanPersistenceArgsSchema,
  reportPersistencePayloadSchema,
} from "../src/shared/contracts.ts";

const payloadSchemas = {
  "rawScanResults:upsertMany": rawScanPersistenceArgsSchema,
  "scanResults:upsertEnrichedMany": enrichedScanPersistenceArgsSchema,
  "reports:seedFromFixture": reportPersistencePayloadSchema,
} as const;

type PayloadSchema = (typeof payloadSchemas)[keyof typeof payloadSchemas];
type MutationName = keyof typeof payloadSchemas;
type PayloadFor<TMutationName extends MutationName> = ReturnType<
  (typeof payloadSchemas)[TMutationName]["parse"]
>;
type PersistencePayload = PayloadFor<MutationName>;

const DEFAULT_BATCH_SIZE = 10;

// Stream `{ "results": [...] }` JSON on stdin and forward it to a Convex
// mutation in chunks via the Convex CLI. Required because Linux enforces a
// per-argv-element cap (MAX_ARG_STRLEN ~= 128 KB) that is much smaller than
// the total ARG_MAX, so passing a full enriched-scan payload to
// `convex run <fn> "$(...)"` fails with E2BIG long before the system limit.

const rawFunctionName = process.argv[2];
if (!rawFunctionName) {
  exitWithInputError(
    "Usage: node scripts/persist-via-convex.ts <function-name> [batch-size]",
  );
}

const functionName = resolveMutationName(rawFunctionName);
const payloadSchema = resolvePayloadSchema(functionName);

const batchSize = parseBatchSize(
  process.argv[3] ?? process.env.PERSIST_BATCH_SIZE,
);

const parsedPayload = await parseStdinJson();
const payload = validatePayload(functionName, payloadSchema, parsedPayload);

const total = payload.results.length;
if (total === 0) {
  process.stderr.write("Payload contained 0 results; nothing to persist.\n");
  process.exit(0);
}

const batchCount = Math.ceil(total / batchSize);
process.stderr.write(
  `Forwarding ${total} result${total === 1 ? "" : "s"} to ${functionName} in ${batchCount} batch${
    batchCount === 1 ? "" : "es"
  } of up to ${batchSize}.\n`,
);

runBatches(functionName, payload.results, batchSize, batchCount);

process.stderr.write(
  `Forwarded ${total} result${total === 1 ? "" : "s"} successfully.\n`,
);

function exitWithInputError(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function isMutationName(functionName: string): functionName is MutationName {
  return Object.prototype.hasOwnProperty.call(payloadSchemas, functionName);
}

function resolveMutationName(functionName: string): MutationName {
  if (!isMutationName(functionName)) {
    exitWithInputError(`No payload schema configured for ${functionName}.`);
  }
  return functionName;
}

function resolvePayloadSchema<TMutationName extends MutationName>(
  functionName: TMutationName,
): (typeof payloadSchemas)[TMutationName] {
  return payloadSchemas[functionName];
}

function parseBatchSize(rawBatchSize: string | undefined): number {
  const batchSize = Number(rawBatchSize ?? String(DEFAULT_BATCH_SIZE));
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
    exitWithInputError("Batch size must be a positive safe integer.");
  }
  return batchSize;
}

async function parseStdinJson(): Promise<unknown> {
  const stdin = await readStdin();
  if (stdin.trim().length === 0) {
    exitWithInputError("No payload received on stdin.");
  }

  try {
    return JSON.parse(stdin);
  } catch (error) {
    exitWithInputError(
      `Failed to parse stdin as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validatePayload(
  functionName: MutationName,
  payloadSchema: PayloadSchema,
  parsedPayload: unknown,
): PersistencePayload {
  try {
    return payloadSchema.parse(parsedPayload);
  } catch (error) {
    exitWithInputError(
      `Payload failed validation for ${functionName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function runBatches(
  functionName: MutationName,
  results: readonly unknown[],
  batchSize: number,
  batchCount: number,
): void {
  for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
    const start = batchIndex * batchSize;
    const slice = results.slice(start, start + batchSize);
    runBatch(functionName, batchIndex, batchCount, slice);
  }
}

function runBatch(
  functionName: MutationName,
  batchIndex: number,
  batchCount: number,
  slice: readonly unknown[],
): void {
  const batchArg = JSON.stringify({ results: slice });

  process.stderr.write(
    `[${batchIndex + 1}/${batchCount}] convex run ${functionName} (${slice.length} item${
      slice.length === 1 ? "" : "s"
    }, ${batchArg.length} bytes)\n`,
  );

  const result = spawnSync("npx", ["convex", "run", functionName, batchArg], {
    stdio: "inherit",
  });

  if (result.error) {
    process.stderr.write(
      `Failed to spawn npx convex run: ${result.error.message}\n`,
    );
    process.exit(1);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.stderr.write(
      `Batch ${batchIndex + 1} failed with exit code ${result.status}; aborting.\n`,
    );
    process.exit(result.status);
  }
}

async function readStdin(): Promise<string> {
  let buffer = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    buffer += chunk;
  }
  return buffer;
}
