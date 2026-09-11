# DealerPulse — Build Plan

> Internal working plan. The graded deliverables are the live Vercel app + `DECISIONS.md`.
> All figures below are computed and verified in `analysis/eda.ipynb`.

## 1. Product thesis

A CEO should grasp the state of the business in **30 seconds**, and a branch manager should be
able to drill into the exact leads and reps responsible. DealerPulse is an
**"executive overview → problem diagnosis → action queue"** application, not a chart gallery.
The differentiator is a **prioritized attention system**: every insight is clickable and resolves
to the specific leads to act on.

### The story the data tells (leads the narrative)
1. **Systemic shortfall** — 160 units delivered vs 1,426 target = **11.2%** attainment. Best month
   (Dec) is 23.9%. June = 0% (cycle lag: ~37-day median sales cycle). Red numbers are the diagnosis, not a bug.
2. **Lakeside Toyota (Bangalore) is the outlier** — 7.6% conversion vs 33–41% elsewhere; its reps fill
   the entire bottom of the leaderboard.
3. **The biggest leak is early and high-value** — 114 leads lost at `new` = **~₹27 cr** never truly engaged.
4. **Losses are early-stage churn, not a late-funnel cluster** — 68% of the 288 losses die at
   `new`/`contacted` (better offer, unresponsive, budget); **"financing not approved" recurs at every
   stage** (14/10/8/6 from new to negotiation), a standing finance-desk friction, not a test-drive/negotiation cluster.
5. **Channel quality** — walk-ins = ~half of all revenue (₹16 cr) at 45.7% conversion; social media is
   weakest by both conversion (13.9%) and revenue/lead (₹3.5 L).
6. **Actionable now (as of 2025-12-31)** — 35 cold leads (₹8.1 cr), 32 stale order-placed (₹7.6 cr),
   30 past expected close (₹6.8 cr).

## 2. Metric-semantics contract (single source of truth)

These live in one analytics layer (`lib/metrics`) and are documented in `DECISIONS.md`.

| Rule | Definition |
|---|---|
| **"Now"** | The dataset cutoff **`2025-12-31`** — never the real wall-clock date. All aging/staleness measured from here. |
| **Delivery metrics** | Keyed on `delivery_date`. |
| **Lead volume / source** | Keyed on `created_at`. |
| **Revenue** | A lead's `deal_value` is realized revenue **only when `status == delivered`**. Open pipeline value is separate. |
| **Funnel** | A lead "reached" a stage if that stage appears in its `status_history` (not from current `status`). |
| **Targets** | Summed only over months inside the selected range. **No partial-month proration.** |
| **`deal_value`** | Static (never changes across history) — safe to treat as fixed. |
| **Anomalies** | 14 `lost` records lack a closing history event / reason → surfaced as **"Unknown"**, never dropped. |
| **Min-sample floor** | Rep rankings require **≥ 5 leads**; sample size always shown. |

## 3. Feature cut

### v1 — Must ship
- **Overview**: KPI row (units vs target, revenue vs target, conversion, open-pipeline value, cold-lead count, avg delivery days) · monthly actual-vs-target · branch comparison · compact funnel · **Needs-Attention panel** (3–5 ranked, evidence-backed insights, each clickable).
- **Drill-down**: company → branch → rep, filters preserved across navigation.
- **Action Center** (the differentiator): deterministic, explainable rules — cold ≥7d · order-placed but stale · past expected-close · branch behind target · high-value late-stage at risk · delivery delayed. Ranked by urgency × stage × age × value; each opens the exact leads (customer, rep, branch, stage, inactivity, value).
- **Filtering**: date-range + branch, persisted in **URL** (shareable).
- **Responsive** desktop + tablet; loading / empty / error states.

### v1 — Should ship (strong derived features, all verified)
- Conversion funnel + **leak matrix** and **time-in-stage** velocity.
- **Loss analysis** — by stage, value, and reason (reason × stage cross-tab).
- **Value-weighted source quality** + **model revenue concentration**.
- **Delivery SLA** — delayed vs on-time + delay-reason breakdown.
- **Rep leaderboard** with min-sample guardrail.

### Deliberately cut (documented in DECISIONS.md as judgment calls)
- **Forecasting / what-if** — open pipeline (62 leads) is trivially small vs targets; an unqualified forecast would look impressive but mislead.
- **Speed-to-lead predictor** — no clean signal here (noisy, small n).
- **Touch-count predictor** — circular artifact (delivered leads simply have all 6 stage entries).
- **AI-generated prose** — templated natural-language summaries instead: faster, reproducible, trustworthy. (Optional stretch only.)
- Auth, export/sharing beyond URL state.

## 4. Architecture

- **Next.js 14 (App Router) + TypeScript** — native Vercel target.
- **Tailwind CSS + shadcn/ui** — polished, real-product feel; strong loading/empty states.
- **Recharts** for charts; a sortable table (shadcn table, TanStack only if needed) for drill-downs.
- **Zod** to validate the JSON at load; **Vitest** on the analytics layer (correctness is 25% of the grade).
- Dataset bundled locally (622 KB); parsed once into a typed model; all derived metrics are pure,
  memoized **selector functions**. Interactive filtering client-side via URL params. No backend/DB needed.

```
app/            page.tsx · branches/[branchId] · reps/[repId] · actions/
components/      dashboard · charts · filters · tables · ui(shadcn)
lib/            data(load+zod) · metrics(selectors) · insights(rules) · formatters
types/          domain types
analysis/       eda.ipynb  (already written & verified)
DECISIONS.md
```

## 5. Timeline (5 days)

| Day | Deliverable |
|---|---|
| 1 | Scaffold app; Zod-validate & type dataset; core selectors (funnel, attainment, aging); metric tests; **deploy skeleton to Vercel early**. |
| 2 | Overview: KPI row, actual-vs-target, branch comparison, funnel; responsive shell. |
| 3 | Branch + rep drill-downs; shared URL filters; loss & source analysis; lead tables. |
| 4 | Action Center rules + ranking + navigation; delivery SLA; loading/empty/error states; tablet polish. |
| 5 | Verify calculations, a11y/perf pass, finish `DECISIONS.md`, final Vercel deploy + smoke test. |

## 6. Definition of done
- CEO identifies the worst branch + top risk within 30 s.
- Every insight opens the exact leads requiring action.
- Filters update every visible metric consistently; overview→branch→rep preserves context.
- Metric tests cover date attribution, funnel, attainment, staleness, missing data.
- Desktop + tablet manually checked; no chart is the sole carrier of important information.
- `DECISIONS.md` covers thesis, metric semantics, tradeoffs, anomalies, next steps.
- Deployed Vercel build passes a final smoke test.
