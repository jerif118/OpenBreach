import municipalities from "../data/municipalities/municipalities.seed.json" with { type: "json" };
import { scanMunicipalities } from "../src/scanner/passive.ts";
import { toRawScanPersistenceArgs } from "../src/scanner/persistence.ts";
import { municipalitySchema } from "../src/shared/contracts.ts";

const records = municipalitySchema.array().parse(municipalities);
const results = await scanMunicipalities(records, { source: "fixture" });

console.log(JSON.stringify(toRawScanPersistenceArgs(results)));
