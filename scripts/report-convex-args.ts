import { readFile } from "node:fs/promises";
import { reportGenerationArtifactSchema } from "../src/shared/contracts.ts";

const inputPath =
  process.argv[2] ?? "data/reports/latest.report-generation.json";
const artifact = reportGenerationArtifactSchema.parse(
  JSON.parse(await readFile(inputPath, "utf8")),
);

console.log(JSON.stringify(artifact.convexPersistenceArgs));
