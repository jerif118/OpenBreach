/**
 * Promote a user to admin without an existing admin (bootstrap helper).
 *
 * Calls the internal mutation `users:elevateToAdmin` via the Convex CLI, so
 * the trust boundary is the deploy key on disk — never exposed to the browser.
 *
 * Usage:
 *   pnpm users:elevate-admin -- --email operator@example.com
 *   pnpm users:elevate-admin -- --clerk-user-id user_2abc...
 *   pnpm users:elevate-admin -- --token 'https://issuer|user_2abc...'
 *   pnpm users:elevate-admin -- --profile-id <convex_id>
 *   pnpm users:elevate-admin -- --token 'https://issuer|user_2abc...' --create
 *   pnpm users:elevate-admin -- --list
 *
 * `--create` only takes effect together with `--token`; it bootstraps a
 * brand-new admin profile when no signed-in user has triggered profile
 * creation yet.
 */

import { spawnSync } from "node:child_process";

type Mode =
  | { kind: "list" }
  | {
      kind: "elevate";
      args: {
        tokenIdentifier?: string;
        clerkUserId?: string;
        email?: string;
        profileId?: string;
        createIfMissing?: boolean;
      };
    };

main();

function main(): void {
  const mode = parseArgs(process.argv.slice(2));
  if (mode.kind === "list") {
    runConvex("users:listProfiles", { limit: 100 });
    return;
  }
  runConvex("users:elevateToAdmin", mode.args);
}

function parseArgs(argv: string[]): Mode {
  if (argv.length === 0) {
    usageAndExit();
  }

  if (argv.includes("--list")) {
    return { kind: "list" };
  }

  const args: {
    tokenIdentifier?: string;
    clerkUserId?: string;
    email?: string;
    profileId?: string;
    createIfMissing?: boolean;
  } = {};

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    // pnpm v11+ forwards a literal `--` separator to scripts instead of
    // consuming it. Silently skip it so both invocation styles work.
    if (flag === "--") continue;
    switch (flag) {
      case "--email":
        args.email = requireValue(argv, ++i, flag);
        break;
      case "--token":
      case "--token-identifier":
        args.tokenIdentifier = requireValue(argv, ++i, flag);
        break;
      case "--clerk-user-id":
      case "--user-id":
        args.clerkUserId = requireValue(argv, ++i, flag);
        break;
      case "--profile-id":
        args.profileId = requireValue(argv, ++i, flag);
        break;
      case "--create":
      case "--create-if-missing":
        args.createIfMissing = true;
        break;
      case "--help":
      case "-h":
        usageAndExit(0);
        break;
      default:
        process.stderr.write(`Unknown argument: ${flag}\n\n`);
        usageAndExit(1);
    }
  }

  const provided = [
    args.tokenIdentifier,
    args.clerkUserId,
    args.email,
    args.profileId,
  ].filter(Boolean).length;
  if (provided !== 1) {
    process.stderr.write(
      "Pass exactly one of: --email, --clerk-user-id, --token, --profile-id\n\n",
    );
    usageAndExit(1);
  }

  if (args.createIfMissing && !args.tokenIdentifier) {
    process.stderr.write(
      "--create only works with --token <tokenIdentifier>\n\n",
    );
    usageAndExit(1);
  }

  return { kind: "elevate", args };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    process.stderr.write(`${flag} requires a value\n`);
    process.exit(1);
  }
  return value;
}

function runConvex(fn: string, args: Record<string, unknown>): void {
  const json = JSON.stringify(args);
  const result = spawnSync("npx", ["convex", "run", fn, json], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (result.error) {
    process.stderr.write(
      `Failed to spawn convex run: ${result.error.message}\n`,
    );
    process.exit(1);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function usageAndExit(code: number = 1): never {
  process.stderr.write(
    [
      "Usage:",
      "  pnpm users:elevate-admin --email <email>",
      "  pnpm users:elevate-admin --clerk-user-id <user_xxx>",
      "  pnpm users:elevate-admin --token '<tokenIdentifier>'",
      "  pnpm users:elevate-admin --profile-id <convex_id>",
      "  pnpm users:elevate-admin --token '<tokenIdentifier>' --create",
      "  pnpm users:elevate-admin --list",
      "",
    ].join("\n"),
  );
  process.exit(code);
}
