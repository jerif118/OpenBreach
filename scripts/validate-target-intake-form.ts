import { readFileSync } from "node:fs";

const source = readFileSync(
  "src/features/target-intake/target-intake-form.tsx",
  "utf8",
);

if (source.includes('setGlobalError(\n            "[ERROR]')) {
  throw new Error(
    "Target intake connection errors must not store the [ERROR] prefix when the alert already renders it.",
  );
}

if (!source.includes("[ERROR] {globalError}")) {
  throw new Error(
    "Target intake global alert must keep a single visible [ERROR] prefix.",
  );
}

console.log("Target intake form validation passed.");
