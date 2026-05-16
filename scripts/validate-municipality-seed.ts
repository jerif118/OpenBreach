import { readFile } from "node:fs/promises";
import { municipalitySeedSchema } from "../src/shared/municipalitySeed.ts";

const seedPath = new URL("../data/municipalities/municipalities.seed.json", import.meta.url);

const rawSeed = await readFile(seedPath, "utf8");
const seed = municipalitySeedSchema.parse(JSON.parse(rawSeed));

if (seed.length < 50) {
  throw new Error(`Municipality seed must contain at least 50 records; found ${seed.length}.`);
}

console.log(`Municipality seed validation passed for ${seed.length} records.`);
