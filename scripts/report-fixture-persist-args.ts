import { readFile } from "node:fs/promises";

const inputPath =
  process.argv[2] ?? "data/reports/latest.report-generation.json";
const artifact = JSON.parse(await readFile(inputPath, "utf8")) as {
  convexPersistenceArgs?: unknown[];
};

if (!Array.isArray(artifact.convexPersistenceArgs)) {
  throw new Error(`${inputPath} does not contain convexPersistenceArgs.`);
}

process.stdout.write(
  `${JSON.stringify({ results: artifact.convexPersistenceArgs })}\n`,
);
