# End-to-end tests (Playwright + TypeScript)

93 browser and API tests against a production build of DealerPulse, in about 35 seconds on one machine.

```bash
npm run test:e2e      # next build, then the full suite
npm run e2e           # suite only, against an existing build
npm run e2e:ui        # Playwright UI mode
npm run e2e:report    # open the last HTML report
npm run typecheck:e2e
```

## Layout

| Folder | What it holds |
|---|---|
| `pages/` | Page objects. `BasePage` owns the shared chrome (header, nav, filter bar, hero, KPI row); one class per route. `PageFactory` builds them, so specs never call constructors. |
| `components/` | Component objects for UI used on many pages: `FilterBar`, `KpiRow`/`KpiCard`, `SortableTable`, `MainNav`. Selectors live in exactly one class. |
| `fixtures/` | `test` and `expect` extended with typed fixtures (`app`, `oracle`, `datasetApi`, `pristineDataset`), options (`skipIntro`, `failOnConsoleErrors`), an auto fixture that fails a test on any browser console error, and a `toShowKpis` matcher. |
| `api/` | `DatasetApi`, a typed client for `/api/dataset` that parses every response against a zod contract. |
| `data/` | `ContinuationBuilder` (fluent builder for upload payloads, validated against the app's own schema on `build()`) and the filter matrix. |
| `oracle/` | `MetricsOracle`: expected on-screen values computed from the bundled dataset with the app's analytics layer. |
| `reporters/` | `quality-summary.ts`, a custom reporter that writes per-project totals, failures, flaky tests, and the slowest tests to Markdown (CI posts it to the job summary). |
| `support/` | `@step` decorator: page-object methods show up as named, boxed steps in reports and traces. |
| `tests/` | Specs. `tests/mutating/` holds everything that changes server state. |

## Projects

- `desktop`: every read-only spec, fully parallel.
- `mobile` (Pixel 7): specs tagged `@responsive`.
- `mutating`: upload and API specs. Depends on the other two and runs on one worker, because the merge overlay is process-wide and two files merging and resetting at once would race.

## What the suite checks

- **Every route** renders with the right heading and active nav item; unknown branches, reps, leads, and paths return the 404 page.
- **Overview KPIs for 36 URL states** (6 periods, including an inverted range and an unknown month, x 6 branch choices) equal the oracle.
- **Cross-view reconciliation without an oracle**: branch-table totals agree with the KPI tiles for every period.
- **Filters**: presets, custom ranges, disabled out-of-range months, URL state surviving a reload, phone width.
- **Sortable table**: every numeric column sorts by value in both directions; CSV export follows the on-screen order and carries raw values that match the oracle.
- **Drill-downs** keep period and branch context; KPI cards scroll to their section; lead and rep pages show the right record.
- **`/api/dataset` contract**: 400 on malformed JSON, 422 with the failing field path, exact add/update counts on merge, idempotent re-upload, reset.
- **Upload flow**: file upload, merge, coverage and KPIs moving to the new month, reset, cancel, client-side rejection with no request sent, server-side validation errors shown to the user.

## Defect found by this suite

The filter dropdowns rendered raw URL values (`q4`, `2025-10`, `B4`) instead of labels until a popup had been opened, on every page load. Fixed by passing value-to-label `items` maps to each Base UI `Select`; covered by "triggers show labels, not raw URL values, on first load".
