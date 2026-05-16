# Municipality Seed Dataset

`municipalities.seed.json` contains 50 source-backed Mexican municipality records for the MVP seed path. Each record includes a stable ASCII `id`, public name, state, population, official municipal website URL, approximate coordinates, source URL, and an explicit initial `riskTier`.

The current population source is INEGI Census 2020 data: https://www.inegi.org.mx/programas/ccpv/2020/. Official website URLs are stored per row so reviewers can spot-check the public municipal identity independently from the population source.

## Commands

- `pnpm municipalities:validate`: validate the seed dataset shape, uniqueness, URL formats, coordinates, and minimum record count.
- `pnpm fixtures:validate`: validate the small runtime fixtures and the municipality seed dataset together.
- `pnpm municipalities:seed`: validate the seed dataset and run the Convex `municipalities:seed` mutation against the configured development deployment.
- `pnpm municipalities:seed:args`: print the JSON argument object used by the Convex seed command.

## Fallback Use

When Convex credentials or a development deployment are unavailable, use `municipalities.seed.json` as the deterministic fallback data source for demos and local review. The JSON file remains committed and reviewable even when the live Convex import cannot run.

## Expansion Notes

The issue target is 500 municipalities. Expand this file by appending records that pass the same validation rules, keep stable IDs in `mx-<state-or-entity>-<municipality>` form, and preserve source URLs for every added row.
