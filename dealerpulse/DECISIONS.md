# DECISIONS.md · DealerPulse

Performance dashboard for a five-branch Toyota dealer group. Live: https://dealerpulse-sooty.vercel.app/ · Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Base UI, Recharts, Zod, Vercel Blob, Vitest.

## What I chose to build, and why

DealerPulse follows an executive overview → diagnosis → action queue flow. It answers whether the group is hitting target, where the funnel leaks, and which leads need action. Every view supports URL-based time and branch filters and drills from company → branch → rep → lead.

- Overview: delivery KPIs, attainment, branch comparison, funnel, pipeline, and period digest.
- Diagnosis: loss reasons, stage progression, source quality, model concentration, and pipeline velocity.
- Comparison: officer leaderboard, branch pages, and individual lead timelines.
- Import: Zod-validated continuation files are merged by record key and can be reset to the bundled dataset.
- The overview, Action Center, and What-If Lab read the same dataset and indexes, so their counts and dates move together after an import.
- Tables sort on raw numeric values and export the current order to CSV; links retain the active filter context.

The interface keeps one shared page structure, readable tables, responsive navigation, and a low-contrast automotive backdrop. Light and dark themes are available without changing the metric presentation.

## The differentiator: the Action Center

The Action Center is a pure, deterministic worklist of open leads needing follow-up. Rules classify stale orders, overdue closes, late-stage idle leads, and cold leads. Items are ranked by deal value, stage depth, and days idle, with a reason and link to the lead record; portfolio alerts add branch shortfalls and delivery delays.

## Key product decisions and tradeoffs

- **Data-derived now.** The cutoff is the last day of the latest target month, 2025-12-31 for the bundled data. A merged month advances the cutoff and all aging metrics.
- **Server-side computation.** The 622 KB dataset is parsed and Zod-validated on the server. Pure selectors compute metrics; React cache and memoized selectors avoid repeated scans.
- **Import merge.** `mergeDatasets` upserts by natural key and the result is persisted in a private Vercel Blob when configured, with an in-memory `globalThis` fallback for local development. Next cache invalidation uses `revalidateTag(tag, { expire: 0 })`.
- **Filtering.** Time ranges and branch scope live in URL query parameters, so refreshes and links preserve the selected view.
- **Correctness.** Analytics, insights, and merge behavior are covered by 39 Vitest tests and reconciled against the exploratory EDA.
- **Ranking floor.** Rep rankings require at least five leads and show a low-sample flag.
- **Organization honesty.** The 30 reps comprise five managers and 25 sales officers; leads belong to officers, so managers are represented through their branch scorecard.
- **Rejected signals.** Speed-to-lead has no clean relationship in this sample. Touch count is circular because delivered leads contain all stage entries.
- **Performance.** Single-pass grouping and memoized lead selectors keep the metric layer O(n); computation is not the limiting latency factor.
- **Anomalies.** Fourteen lost leads lack a closing history event or reason and are surfaced as `Unknown` rather than dropped.
- **Presentation.** KPI cards link to the underlying section, and dense worklists use native disclosure controls so the full list remains available.

### Metric contract

| Metric | Rule |
|---|---|
| Delivery volume and revenue | Keyed on `delivery_date`; revenue is realized only on delivery. |
| Lead volume, conversion, funnel, sources | Keyed on `created_at`. |
| Funnel reached stage | Reconstructed from `status_history`, not current status. |
| Targets | Summed over selected months; no partial-month proration. |
| Open pipeline and staleness | Snapshot at the data-derived cutoff, scoped by branch and rep. |

### Forecast, What-If, and what changed

- **Forecast.** Open leads are discounted by historical `P(delivered | reached stage)`. The base open book is ₹15.15 Cr, yielding about 42 expected units and ₹9.88 Cr.
- **What-If Lab.** Four independent levers use current-view baselines: conversion lift, at-risk recovery, coaching below-median reps, and source scaling. Results are never summed because the levers overlap.
- **Period digest.** The overview compares units, attainment, and revenue month over month using deliveries. It does not report lead-conversion trends because recent cohorts are immature.

The forecast and What-If views are decision aids, not predictions of total target attainment. Their assumptions and current-view baselines remain visible in the UI.

## Interesting patterns in the data

- **Systemic shortfall:** 160 delivered units against 1,426 target units is 11.2% attainment. December is the strongest month at 23.9%; June is 0% because of sales-cycle lag.
- **Lakeside outlier:** Lakeside converts at 7.6% versus 33–41% elsewhere and occupies the bottom of the officer leaderboard.
- **Early funnel leak:** 288 losses include 114 at `new` and 81 at `contacted`, so 68% occur before a test drive.
- **Revenue concentration:** Fortuner, Innova Hycross, and Camry account for 65% of ₹38.88 Cr delivered revenue; Fortuner contributes 32%.
- **Channel quality:** `walk_in` converts at 45.7% and contributes about half of revenue; `social_media` converts at 13.9% and has ₹3.5 L revenue per lead.
- **Organization shape:** Five branches have five managers and 25 officers; only officers carry leads.
- **Loss reasons:** Financing friction appears at every funnel stage, while early non-engagement is the largest loss pattern.

The base file spans June through December 2025. December is the latest complete month in the data; imported months use the same rules.

## What I'd build next with more time

- Versioned, user-scoped imports with optimistic locking and rollback.
- Lead follow-up logging and reassignment from the lead page.
- Deterministic per-branch narrative summaries.
- Created-month cohort analysis to separate cycle lag from performance change.
- Saved filter presets, shareable exports, and Playwright smoke coverage.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 39-test analytics and merge suite
npm run build
```

Source analysis: [`../analysis/eda.ipynb`](../analysis/eda.ipynb).
