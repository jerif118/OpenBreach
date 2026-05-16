import { readFile } from "node:fs/promises";
import { toEnrichedScanPersistenceArgs } from "../src/scanner/enrichedPersistence.ts";
import { enrichScanEvidenceBatch } from "../src/scanner/risk.ts";
import { rawScanEvidenceSchema } from "../src/shared/contracts.ts";

const inputPath = process.argv[2] ?? "data/scans/latest.scan-results.json";
const rawResults = rawScanEvidenceSchema.array().parse(JSON.parse(await readFile(inputPath, "utf8")));

console.log(JSON.stringify(toEnrichedScanPersistenceArgs(enrichScanEvidenceBatch(rawResults))));
