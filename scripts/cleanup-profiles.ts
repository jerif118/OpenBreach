/**
 * Delete stale or duplicate `userProfiles` rows.
 *
 * Selection (combine any of these; matches are unioned):
 *   --profile-id <id>          (repeatable) explicit profile to delete
 *   --clerk-user-id <user_xxx> (repeatable) match by tokenIdentifier suffix
 *   --null-only                all profiles where email AND name are null
 *   --email <addr> --keep-newest
 *                              all rows with that email except the most
 *                              recently created one (use to dedupe a single
 *                              email that got multiple Clerk users)
 *
 * Modes:
 *   (default)   dry-run — prints the rows that WOULD be deleted, no writes.
 *   --yes       actually delete the matched rows.
 *   --list      print every profile and exit without deleting.
 *
 * With no arguments (or `--help`), prints usage and exits successfully so
 * `pnpm users:cleanup-profiles` does not fail the lifecycle script.
 *
 * Examples:
 *   pnpm users:cleanup-profiles --list
 *   pnpm users:cleanup-profiles --null-only            # preview
 *   pnpm users:cleanup-profiles --null-only --yes      # execute
 *   pnpm users:cleanup-profiles --profile-id jh77... --yes
 *   pnpm users:cleanup-profiles --email you@x.com --keep-newest --yes
 */

import { spawnSync } from "node:child_process";

type Profile = {
  profileId: string;
  tokenIdentifier: string;
  email: string | null;
  name: string | null;
  roles: string[];
};

type Options = {
  profileIds: string[];
  clerkUserIds: string[];
  emails: string[];
  nullOnly: boolean;
  keepNewest: boolean;
  list: boolean;
  yes: boolean;
};

main();

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.list) {
    const profiles = listProfiles();
    printProfiles(profiles);
    return;
  }

  const profiles = listProfiles();
  const toDelete = selectMatches(profiles, opts);

  if (toDelete.length === 0) {
    process.stderr.write(
      "No profiles matched the given filters. Nothing to do.\n",
    );
    process.exit(0);
  }

  process.stderr.write(`Matched ${toDelete.length} profile(s) for deletion:\n`);
  printProfiles(toDelete);

  if (!opts.yes) {
    process.stderr.write("\nDry-run only. Re-run with --yes to delete.\n");
    return;
  }

  process.stderr.write("\nDeleting…\n");
  runConvex("users:deleteProfiles", {
    profileIds: toDelete.map((p) => p.profileId),
  });
}

function parseArgs(argv: string[]): Options {
  if (argv.length === 0) {
    usageAndExit(0);
  }

  const opts: Options = {
    profileIds: [],
    clerkUserIds: [],
    emails: [],
    nullOnly: false,
    keepNewest: false,
    list: false,
    yes: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--") continue; // tolerate pnpm separator
    switch (flag) {
      case "--profile-id":
        opts.profileIds.push(requireValue(argv, ++i, flag));
        break;
      case "--clerk-user-id":
      case "--user-id":
        opts.clerkUserIds.push(requireValue(argv, ++i, flag));
        break;
      case "--email":
        opts.emails.push(requireValue(argv, ++i, flag));
        break;
      case "--null-only":
        opts.nullOnly = true;
        break;
      case "--keep-newest":
        opts.keepNewest = true;
        break;
      case "--list":
        opts.list = true;
        break;
      case "--yes":
      case "-y":
        opts.yes = true;
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

  const hasSelector =
    opts.profileIds.length > 0 ||
    opts.clerkUserIds.length > 0 ||
    opts.emails.length > 0 ||
    opts.nullOnly;
  if (!opts.list && !hasSelector) {
    process.stderr.write(
      "Pass at least one selector (--profile-id, --clerk-user-id, --email, --null-only) or --list.\n\n",
    );
    usageAndExit(1);
  }

  if (opts.keepNewest && opts.emails.length === 0) {
    process.stderr.write("--keep-newest requires --email <addr>.\n\n");
    usageAndExit(1);
  }

  return opts;
}

function selectMatches(profiles: Profile[], opts: Options): Profile[] {
  const matchedIds = new Set<string>();

  for (const id of opts.profileIds) {
    matchedIds.add(id);
  }

  for (const userId of opts.clerkUserIds) {
    for (const profile of profiles) {
      if (profile.tokenIdentifier.endsWith(`|${userId}`)) {
        matchedIds.add(profile.profileId);
      }
    }
  }

  for (const email of opts.emails) {
    const sameEmail = profiles.filter((p) => p.email === email);
    if (opts.keepNewest && sameEmail.length > 1) {
      // Convex doc ids encode creation time ascending; the lexicographically
      // greatest id is the most recently created row.
      const sorted = [...sameEmail].sort((a, b) =>
        a.profileId.localeCompare(b.profileId),
      );
      const newest = sorted[sorted.length - 1];
      for (const profile of sameEmail) {
        if (profile.profileId !== newest.profileId) {
          matchedIds.add(profile.profileId);
        }
      }
    } else {
      for (const profile of sameEmail) {
        matchedIds.add(profile.profileId);
      }
    }
  }

  if (opts.nullOnly) {
    for (const profile of profiles) {
      if (profile.email === null && profile.name === null) {
        matchedIds.add(profile.profileId);
      }
    }
  }

  return profiles.filter((p) => matchedIds.has(p.profileId));
}

function listProfiles(): Profile[] {
  const result = spawnSync(
    "npx",
    ["convex", "run", "users:listProfiles", JSON.stringify({ limit: 500 })],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  if (result.error) {
    process.stderr.write(
      `Failed to spawn convex run: ${result.error.message}\n`,
    );
    process.exit(1);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
  const stdout = result.stdout?.trim() ?? "";
  const jsonStart = stdout.indexOf("[");
  const jsonText = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
  try {
    return JSON.parse(jsonText) as Profile[];
  } catch (err) {
    process.stderr.write(
      `Could not parse listProfiles output: ${
        err instanceof Error ? err.message : String(err)
      }\nOutput: ${stdout.slice(0, 200)}…\n`,
    );
    process.exit(1);
  }
}

function printProfiles(profiles: Profile[]): void {
  if (profiles.length === 0) {
    process.stderr.write("(no profiles)\n");
    return;
  }
  for (const profile of profiles) {
    const email = profile.email ?? "(null)";
    const name = profile.name ?? "(null)";
    process.stderr.write(
      `  ${profile.profileId}  ${email.padEnd(32)}  ${name.padEnd(24)}  [${profile.roles.join(", ")}]  ${profile.tokenIdentifier}\n`,
    );
  }
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
      "  pnpm users:cleanup-profiles --list",
      "  pnpm users:cleanup-profiles --null-only                # preview",
      "  pnpm users:cleanup-profiles --null-only --yes          # delete",
      "  pnpm users:cleanup-profiles --profile-id <id> --yes",
      "  pnpm users:cleanup-profiles --clerk-user-id user_xxx --yes",
      "  pnpm users:cleanup-profiles --email you@x.com --keep-newest --yes",
      "",
      "Selectors can be combined (matches are unioned).",
      "Default mode is dry-run; pass --yes to actually delete.",
      "",
    ].join("\n"),
  );
  process.exit(code);
}
