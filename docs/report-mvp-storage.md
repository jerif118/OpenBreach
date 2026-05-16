# Report MVP Storage

Generated remediation-report PDFs are written to `data/reports/` for the MVP. Each completed report now renders two artifact variants:

- `data/reports/<municipality-id>-technical.pdf`
- `data/reports/<municipality-id>-friendly.pdf`

Each PDF reference stores the relative path, filename, content type, generated timestamp, and size metadata. The technical PDF remains available through the legacy `pdf` metadata field for compatibility, and the full dual-artifact set is exposed through `artifacts.technical` and `artifacts.friendly`.

The visual structure of each PDF is driven by editable Markdown templates in `src/reports/templates/technical-report.md` and `src/reports/templates/friendly-report.md`. The renderer fills those placeholders with structured report data and then applies the styled PDF layout. Template text and section ordering can be changed there without rewriting the workflow.

This path is a local/server-side artifact path for scripts. The municipality detail page serves completed report PDFs through the TanStack Start route `/reports/$fileName`, where `$fileName` must match the safe PDF file name stored in report metadata. The route reads only from `data/reports/` and returns `404` when the requested local PDF is not present.

Run `pnpm report:generate` to select the fixture-backed top-risk records, normalize the input, generate technical plus friendly report JSON, render both PDFs, and write the end-to-end artifact to `data/reports/latest.report-generation.json`. Run `pnpm report:generate:validate` to verify that command, generated PDFs, report contract output, and persistence handoff metadata.

Run `pnpm report:persist:args` to print the generated persistence payloads for `reports.persistGenerated`. In a live Convex deployment, replace fixture external IDs with live Convex document IDs and run the mutation with authenticated Convex context as an `operator` or `admin`, for example `convex run reports:persistGenerated '<args>'` from a configured operator environment. Local validation does not perform the live write because `reports.persistGenerated` requires authenticated live Convex document IDs.

Missing report metadata is a valid live state. `municipalities.get({ id })` returns `report: null` and `reports.getForMunicipality({ municipalityId })` returns `null` until metadata is persisted. Do not treat committed PDF fixtures as automatically persisted Convex rows; use them for local/server-side artifacts and persist metadata only through the protected Convex write path.
