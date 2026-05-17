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

// Stream `{ "results": [...] }` JSON on stdin and forward it to a Convex
// mutation in chunks via the Convex CLI. Required because Linux enforces a
// per-argv-element cap (MAX_ARG_STRLEN ~= 128 KB) that is much smaller than
// the total ARG_MAX, so passing a full enriched-scan payload to
// `convex run <fn> "$(...)"` fails with E2BIG long before the system limit.

const functionName = process.argv[2];
if (!functionName) {
  exitWithInputError(
    "Usage: node scripts/persist-via-convex.ts <function-name> [batch-size]",
  );
}

const payloadSchema = resolvePayloadSchema(functionName);

const batchSize = Math.max(
  1,
  Number(process.argv[3] ?? process.env.PERSIST_BATCH_SIZE ?? "10"),
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

function resolvePayloadSchema(functionName: string): PayloadSchema {
  const payloadSchema =
    payloadSchemas[functionName as keyof typeof payloadSchemas];
  if (!payloadSchema) {
    exitWithInputError(`No payload schema configured for ${functionName}.`);
  }
  return payloadSchema;
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
  functionName: string,
  payloadSchema: PayloadSchema,
  parsedPayload: unknown,
): { results: unknown[] } {
  try {
    return payloadSchema.parse(parsedPayload);
  } catch (error) {
    exitWithInputError(
      `Payload failed validation for ${functionName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function runBatches(
  functionName: string,
  results: unknown[],
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
  functionName: string,
  batchIndex: number,
  batchCount: number,
  slice: unknown[],
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
