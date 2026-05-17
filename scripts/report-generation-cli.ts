import {
  reportGenerationCliOptionsSchema,
  type ReportGenerationCliOptions,
} from "../src/shared/contracts.ts";

const DEFAULT_OUTPUT_PATH = "data/reports/latest.report-generation.json";
const DEFAULT_GENERATED_AT = new Date().toISOString();
const MAX_LIMIT = 1_000;

type CliOptionDraft = {
  generatedAt: string;
  limit: number;
  outputPath: string;
};

function parseLimit(value: string): number {
  const limit = Number(value);

  if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
    throw new Error(`Invalid --limit value: ${value}.`);
  }

  return limit;
}

function readRequiredValue(
  argv: string[],
  index: number,
  flag: string,
  { allowFlagLikeValue = false }: { allowFlagLikeValue?: boolean } = {},
): string {
  const value = argv[index + 1];

  if (value === undefined || (!allowFlagLikeValue && value.startsWith("--"))) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

export function readCliOptions(argv: string[]): ReportGenerationCliOptions {
  const options: CliOptionDraft = {
    generatedAt: DEFAULT_GENERATED_AT,
    limit: 10,
    outputPath: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    switch (flag) {
      case "--":
        continue;
      case "--generated-at":
        options.generatedAt = readRequiredValue(argv, index, flag);
        index += 1;
        continue;
      case "--limit":
        options.limit = parseLimit(readRequiredValue(argv, index, flag));
        index += 1;
        continue;
      case "--all":
        options.limit = MAX_LIMIT;
        continue;
      case "--output":
        options.outputPath = readRequiredValue(argv, index, flag, {
          allowFlagLikeValue: true,
        });
        index += 1;
        continue;
      default:
        throw new Error(`Unknown report generation option: ${flag}.`);
    }
  }

  return reportGenerationCliOptionsSchema.parse(options);
}
