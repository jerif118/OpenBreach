import { readFile } from "node:fs/promises";
import { municipalitySeedSchema } from "../src/shared/municipalitySeed.ts";

const seedPath = new URL("../data/municipalities/municipalities.seed.json", import.meta.url);
const records = municipalitySeedSchema.parse(JSON.parse(await readFile(seedPath, "utf8")));

console.log(JSON.stringify({ municipalities: records }));
