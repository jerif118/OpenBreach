import { readFile } from "node:fs/promises";
import {
  reportGenerationArtifactSchema,
  reportPersistencePayloadSchema,
} from "../src/shared/contracts.ts";

const inputPath =
  process.argv[2] ?? "data/reports/latest.report-generation.json";
const artifact = reportGenerationArtifactSchema.parse(
  JSON.parse(await readFile(inputPath, "utf8")),
);
const payload = reportPersistencePayloadSchema.parse({
  results: artifact.convexPersistenceArgs,
});

process.stdout.write(`${JSON.stringify(payload)}\n`);
