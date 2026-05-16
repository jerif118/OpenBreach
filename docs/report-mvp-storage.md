# Report MVP Storage

Generated remediation-report PDFs are written to `data/reports/` for the MVP. Each PDF reference stores a relative `data/reports/<municipality-id>.pdf` path plus filename, content type, generated timestamp, and size metadata.

This path is a local/server-side artifact path for scripts and downstream issue #8 integration. Public serving is deferred until the municipality detail page or backend file-storage work selects a download mechanism.

Run `pnpm report:generate` to select the fixture-backed top-risk records, generate deterministic fallback report JSON, render PDFs, and write the end-to-end artifact to `data/reports/latest.report-generation.json`. Run `pnpm report:generate:validate` to verify that command, generated PDFs, report contract output, and persistence handoff metadata.

Run `pnpm report:persist:args` to print the generated persistence payloads for `reports.persistGenerated`. In a live Convex deployment, replace fixture external IDs with live Convex document IDs and run the mutation with authenticated Convex context as an `operator` or `admin`, for example `convex run reports:persistGenerated '<args>'` from a configured operator environment. Local validation does not perform the live write because `reports.persistGenerated` requires authenticated live Convex document IDs.

Missing report metadata is a valid live state. `municipalities.get({ id })` returns `report: null` and `reports.getForMunicipality({ municipalityId })` returns `null` until metadata is persisted. Do not treat committed PDF fixtures as automatically persisted Convex rows; use them for local/server-side artifacts and persist metadata only through the protected Convex write path.
