# DECISIONS.md · DealerPulse

Performance dashboard for a five-branch Toyota dealer group. Live: https://dealerpulse-sooty.vercel.app/ · Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Base UI, Recharts, Zod, Vercel Blob, Vitest.

This is a record of how the product actually came together, including the decisions I reversed and the ideas I dropped, not a tidy after-the-fact story.

## Where I started

I spent the first pass in a notebook (`../analysis/eda.ipynb`) before writing any UI, because I did not want to design around assumptions. The data changed the plan. This is not a healthy business with a few charts to draw; it is a business missing target by a wide margin with a handful of specific, fixable causes. So I stopped planning a chart gallery and built an executive overview to diagnosis to action-queue flow instead. Three questions drive every screen: are we hitting target, where is the funnel leaking, and which leads do I act on today.

The exploration is also where two "insights" died. I tried speed-to-lead and touch-count as quality signals; speed-to-lead had no clean relationship in this sample, and touch-count turned out circular (delivered leads simply carry all six stage entries). Both looked clever and would have been misleading, so I cut them.

## What I built

- Overview: delivery KPIs, attainment, branch comparison, funnel, pipeline, and a "what changed this period" digest.
- Diagnosis: loss reasons by stage, source quality, model concentration, and pipeline velocity.
- Comparison and drill-down: an officer leaderboard, per-branch pages, and individual lead timelines. Every view drills company to branch to rep to lead.
- Action Center: the differentiator, described below.
- Data Import: Zod-validated continuation files merge into the live dashboard and can be reset.

Filters (time range and branch) live in the URL so views are shareable and navigation keeps context. The overview, Action Center, and What-If Lab read the same dataset and indexes, so their numbers move together after an import.

## The differentiator: the Action Center

Most dashboards stop at "social media converts at 14%." I wanted mine to end at a worklist. The Action Center is a pure, deterministic set of rules over open leads: stale orders, overdue closes, late-stage idle leads, and cold leads. Each item is ranked by deal value, stage depth, and days idle, carries a plain-language reason, and links to the exact lead. A portfolio band above it flags branches below the group's attainment and delivery delays, so it covers both which deals to chase and which parts of the business are slipping.

## Decisions I made, revised, or rejected

- **"Now" is derived from the data, not the clock.** My first cut used the wall clock, which made aging and the action queue nonsensical against historical data. I moved the cutoff to the last day of the latest reporting month (2025-12-31 for the bundled data). Later I found a hardcoded cutoff was silently hiding any imported month from the snapshot views, so I made the cutoff advance automatically on merge. The "as of" date is shown in the UI.
- **Attainment and conversion are not the same number.** It is easy to conflate 11.2% unit attainment (160 delivered against a 1,426 target) with 31.4% lead conversion (160 delivered of 510 created). I kept them strictly separate everywhere, because mixing them is the most likely way to report a wrong headline.
- **No manager leaderboard.** I planned one, then saw all 510 leads belong to sales officers and the five branch managers carry zero individual pipeline. Rather than fake it, the leaderboard is honestly an officer leaderboard and each manager is judged by their branch page.
- **A bounded forecast, not a prediction.** I was tempted to answer "will we hit target." With only 62 open leads across all branches, that projection would look impressive and mislead, so the forecast only discounts the open book by each stage's historical close rate (₹15.15 Cr face to about 42 expected units and ₹9.88 Cr) and says nothing about total attainment.
- **The What-If Lab got simpler on purpose.** The first version showed too much per lever and was hard to read. I cut each lever down to the one decision number it exists for and moved the rest behind a disclosure. The levers are never summed, because they draw on overlapping leads and a naive total would double-count.
- **The period digest is delivery-anchored.** An earlier version compared lead conversion month over month; the newest month's leads are still inside the roughly 37-day sales cycle, so their conversion always looked near zero and read as a false alarm. It now compares units, attainment, and revenue only.
- **Server-side compute, no database.** The dataset is about 622 KB. I parse and Zod-validate it once on the server and compute metrics in a pure, memoized selector layer. I measured before optimizing: a full metrics sweep runs in roughly 0.03 ms, so latency is framework and network, not computation. A Rust or WASM rewrite would cost more at the boundary than it saved, so I did not do it.
- **Import persistence changed once it had to be real.** In-memory state worked locally but would not survive across serverless instances or redeploys, so the merge persists to a private Vercel Blob when configured and falls back to in-memory for local dev. The data layer never lets a storage hiccup take down the dashboard.
- **Correctness is tested.** A 39-test Vitest suite asserts the exact figures I verified in the notebook, and the newer selectors are checked by reconciliation (the loss-by-stage matrix must sum to total losses; model revenue shares must sum to 100%) so they cannot silently drift.
- **Small honesty calls.** Rankings carry a five-lead floor and a low-sample flag. Fourteen lost leads with no closing reason surface as `Unknown` rather than being dropped. Flagged leads are shown in full, never truncated. Filter ranges cannot be set to invert.

### Metric contract

| Metric | Rule |
|---|---|
| Delivery volume and revenue | Keyed on `delivery_date`; revenue realized only on delivery. |
| Lead volume, conversion, funnel, sources | Keyed on `created_at`. |
| Funnel reached stage | Reconstructed from `status_history`, not current status. |
| Targets | Summed over selected months; no partial-month proration. |
| Open pipeline and staleness | Snapshot at the data-derived cutoff, scoped by branch and rep. |

## What the data showed

- **Systemic shortfall:** 160 delivered against 1,426 target is 11.2% attainment. December is the strongest month at 23.9%; June is 0% from sales-cycle lag. The whole group is behind, not one branch.
- **Lakeside is the outlier:** 7.6% conversion versus 33 to 41% elsewhere, and its reps fill the bottom of the leaderboard. This emerged from the data; it is not hardcoded.
- **The leak is early and broad:** of 288 losses, 114 die at `new` and 81 at `contacted`, so 68% are lost before a test drive.
- **Revenue concentrates:** Fortuner, Innova Hycross, and Camry are 65% of ₹38.88 Cr delivered revenue, Fortuner alone 32%.
- **Channel quality is lopsided:** walk-ins convert at 45.7% and drive about half of revenue; social media converts at 13.9%.
- **Financing friction is standing, not late-stage:** "financing not approved" recurs at every funnel stage rather than clustering at the end.

## What I would build next

- Versioned, user-scoped imports with optimistic locking and rollback.
- Follow-up logging and reassignment from the lead page.
- Per-branch narrative summaries, with an optional LLM pass over the same reproducible metrics.
- A created-month cohort view to separate cycle lag from genuine decline.
- Saved filter presets, shareable exports, and Playwright smoke tests.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 39-test analytics and merge suite
npm run build
```

Source analysis: [`../analysis/eda.ipynb`](../analysis/eda.ipynb).
