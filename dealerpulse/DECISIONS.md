# DECISIONS.md — DealerPulse

A real-time performance dashboard for a 5-branch Toyota dealer group. Built for a
CEO to grasp the state of the business in 30 seconds, and for branch managers to
drill into the exact leads and reps behind the numbers.

**Live:** _https://dealerpulse-sooty.vercel.app/_ · **Stack:** Next.js 16 (App Router) · TypeScript ·
Tailwind + shadcn/ui · Recharts · Zod · Vercel Blob · Vitest

---

## What I chose to build, and why

The dataset's story isn't "here are some charts" — it's a business in trouble with
a few specific, fixable causes. So I built an **executive-overview → diagnosis →
action-queue** product rather than a chart gallery. Three questions drive every screen:

1. **Are we hitting target?** — KPI row + monthly attainment, branch comparison.
2. **Why not / where's the leak?** — conversion funnel, a **loss reason × stage
   matrix** (which reason kills deals at which stage), and channel quality.
3. **What do I do *right now*?** — the **Action Center**: deterministic, explainable
   alerts that resolve to the exact leads to call today.
4. **How do we stack up?** — a company-wide **Sales Team** leaderboard and
   **revenue-by-model** concentration, so reps, branches, and product mix compare on
   one screen.

Every insight is scoped by the global **time-range + branch filter** (state lives in
the URL, so views are shareable and navigation preserves context), and you can drill
all the way down: **company → branch → rep → individual lead**. Any flagged lead opens
its own page with the full **status-history timeline** (every stage transition, with
notes), owner, value, and delivery or loss detail, so an alert always resolves to the
specific record and its story.

### Design & UX
The look is a **crisp, modern-SaaS** system: a distinctive display typeface
(Space Grotesk) for headings and big tabular numbers over a neutral, data-dense
base, with a single indigo brand accent so **color carries meaning rather than
decoration** — attainment and alerts read green/amber/red by health, and the accent
marks only navigation, links, and the active view. Every page shares one headline
band, the nav always shows where you are, and each filter is captioned so nothing
is a mystery.

The dashboard is built to **tell a story anyone can read**, not just analysts:

- **A plain-language headline on every screen.** Each page opens with one sentence
  computed from the data in view — e.g. *"The group delivered 160 of 1,426 target
  cars (11% of plan). Eastside leads at 15%; Lakeside trails at 2%."* — so the
  takeaway lands before any chart.
- **KPI cards are drill-downs — and carry trend.** Every headline number links
  straight to the data behind it (attainment/revenue/units → the branch table;
  conversion → the funnel; pipeline/cold → the Action Center), so a CEO clicks the
  number they care about. The three delivery-anchored cards also show a monthly
  **sparkline** and a **month-over-month delta** ("+55% vs Nov"). Conversion and the
  pipeline snapshots deliberately get neither: a monthly conversion trend is a
  cohort-immaturity artifact, and a snapshot has no series — a sparkline on either
  would mislead.
- **Dense sections collapse.** "Needs attention" on the overview and the four
  Action-Center rule buckets are expandable dropdowns (native `<details>`, zero JS),
  each showing a live count + value while collapsed — the page stays uncluttered but
  nothing is hidden.
- **Every ranked/tabular view is sortable.** One reusable table component lets you
  re-rank by any column (A–Z for text, high/low for numbers, newest/oldest for
  dates), sorting on raw values so ₹ and % order by magnitude.
- **The leaderboard is legible at a glance.** The Sales Team table carries serial
  numbers and **top-3 / top-5 / top-10 medal tiers** (gold/silver/bronze) that track
  whatever you sort by.
- **The funnel reads top-to-bottom in words.** Each stage names how many leads
  reached it and how many *dropped off* to the next ("118 dropped off (23%)"),
  instead of leaving the reader to decode bar widths.

### The differentiator: the Action Center
Most dashboards stop at "social media converts at 14%." This one ends at a ranked,
explainable worklist: _"Order placed but no activity for 194 days — delivery at
risk. Omkar Varma, Lakeside, ₹51 L."_ Rules are pure functions (no black box),
ranked by **deal value × stage depth × days idle**, each carrying a one-line reason
and linking straight to that lead's journey. Above the lead-level buckets sits a
**portfolio-alert band**: branches below the group's attainment (ranked by unit
shortfall) and a delivery-delay summary, so the queue covers both "which deals to
chase" and "which parts of the business are slipping".

### Data Import
Real dealership data arrives continuously, so there's a **Data Import** screen: drop
in a JSON continuation (new months, leads, deliveries) and it is Zod-validated and
merged into the live dashboard, upserting each record by id (new records added,
existing ones updated). Because "now" is derived from the data (see below), a merged
month **reflects across every screen** — KPIs, the attainment trend, the funnel, the
leaderboard, and the aging/Action-Center snapshot all move together, and the "as of"
date advances with it. A one-click demo continuation lets a reviewer try it without a
file, and **Reset to original** returns to the bundled data.

### Looking forward: forecast, What-If, and "what changed"
The Action Center answers "what's wrong right now." Three more views answer "what's
next" and "what moved" — the questions an executive actually opens a dashboard for.

- **Probability-weighted pipeline forecast.** The open book isn't worth its face
  value; each live lead is discounted by its **stage's historical close rate**
  (`P(delivered | reached stage)`, which rises monotonically 31% → 41% → 53% → 68% →
  81% because every delivered lead passed through the earlier stages). Today's
  ₹15.15 Cr of open pipeline weights down to an expected **₹9.88 Cr / ~42 units** —
  the honest, do-nothing baseline. In-flight leads count as not-yet-closed, so the
  estimate is deliberately conservative.
- **The What-If Lab.** Four independent levers an exec can size before committing
  effort: lift conversion (each point is worth ~5 cars on this book), rescue the
  flagged at-risk pipeline (₹8.25 Cr), coach below-median reps to the team median
  (a real +30-unit ceiling, led by one rep at 5% on 22 leads), and scale a
  high-converting channel at *its own* historical quality. Every projection reads
  the current view's verified baselines; all math is pure and unit-tested. The
  levers are shown **independently and never summed** — they draw on overlapping
  leads, so a naive total would double-count. Assumptions are stated on each card.
- **A "what changed this period" digest** on the overview, generated deterministically
  from the same metrics. It is **delivery-anchored on purpose**: it reports units,
  attainment, and revenue (keyed on `delivery_date`) month-over-month, and never
  month-over-month lead conversion — the newest month's leads are still inside the
  ~37-day sales cycle, so their conversion always looks near-zero and would read as a
  false alarm. Ranked tables also export to **CSV** in their current sort order.

---

## Key product decisions & tradeoffs

- **"Now" is derived from the data, not the wall clock.** Aging and the action queue
  are meaningless against today's date (the data is historical), so the analytical
  cutoff is the **last day of the latest reporting month** — 2025-12-31 for the
  bundled data, and it advances automatically when a new month is imported. This
  keeps every baseline number identical while making a merged continuation move the
  aging/staleness metrics too (a hardcoded cutoff had silently hidden any imported
  month from the snapshot views). The "as of" date is shown in the UI so nobody
  mistakes it for live data.
- **Client-side vs. backend:** the dataset is 622 KB. I parse + Zod-validate it once
  on the **server** (so it never bloats the client bundle) and compute every metric in
  a pure, memoized selector layer. No database earns its keep here.
- **Performance is measured, not guessed.** A full metrics sweep over the dataset runs
  in **~0.03 ms**; the one-time parse is ~2 ms and cached. Page latency is framework +
  network, not computation, so the right levers are caching (module-scope parse, React
  `cache()`, the Next data cache over the Blob read) and instant client navigation —
  all of which are in place. The selector layer still uses **single-pass grouping**
  (`branchComparison`, `monthlyAttainment`) and memoized `scopedLeads` so it stays
  O(n) as the data grows. A native (Rust/WASM) rewrite would be counter-productive
  here: the JS↔WASM serialization boundary would cost more than the microseconds of
  compute it could save.
- **Import merge is validated and persisted for real.** The Data Import screen reuses
  the same Zod schema to validate a continuation, then merges via a pure `mergeDatasets`
  function (upsert by id) that the metrics layer reads through unchanged. The merged
  dataset is stored in **Vercel Blob** (a single JSON blob) when `BLOB_READ_WRITE_TOKEN`
  is present, so a merge is **shared across every serverless instance and survives
  redeploys** — it reflects on the hosted deployment, not just one warm process. With no
  token (plain local dev) it falls back to in-memory state on `globalThis` so the flow
  still works zero-config. The data layer is async and memoized per request with React
  `cache()`, and never lets a storage hiccup take down the dashboard (it falls back to
  the bundled data). A store swap (KV, a database) is a one-file change behind the same
  interface.
- **Correctness is a feature, so I tested it.** The analytics + merge layers have a
  24-test Vitest suite asserting the exact figures I verified in `../analysis/eda.ipynb`
  (160 delivered,
  11.2% attainment, 35 cold leads, 114 losses at the `new` stage, etc.). The newer
  selectors are checked by *reconciliation* — the loss reason × stage matrix must sum to
  the total losses, and model revenue shares must sum to 100% of delivered revenue — so
  they can't silently drift from the headline numbers.
- **Rankings show their sample size.** Several Lakeside reps have only 12–22 leads, so
  rep rankings carry a `≥5 leads` floor and a "low sample" flag — no crowning or
  condemning on thin data.
- **A manager's scorecard is their branch.** All 510 leads are assigned to sales
  *officers*; the 5 branch managers carry **zero** individual pipeline (they map 1:1 to
  the 5 branches). So rather than fake a manager leaderboard, I name each branch's
  manager on the branch page and treat that page as their accountability view — the
  rep leaderboard is honestly an *officer* leaderboard.
- **Every flagged lead is shown, never truncated.** The Action Center's job is to be a
  worklist, so a "+37 more" placeholder that hid the leads would defeat it. Each bucket
  renders in full (scrollable); the overview shows a top-5 teaser that links to the
  complete list.
- **Illogical filter states are unrepresentable.** The From/To pickers clamp so the
  range can't invert (choosing a start after the end moves the end with it), and
  invalid months are disabled — the user can't construct a nonsensical timeline.
- **Anomalies are disclosed, not hidden.** 14 leads are marked `lost` with no closing
  history event or reason; they surface as **"Unknown"** rather than being dropped.
- **I deliberately did *not* build a forecast.** With targets of ~200 units/month and
  only 62 open leads across all branches, any "will we hit target?" projection would
  look impressive and mislead. I show honest pace-to-target instead.
- **I rejected two tempting-but-fake signals** after testing them in the EDA:
  *speed-to-lead* (no clean relationship here; small, noisy sample) and *touch count*
  (circular — delivered leads simply have all six stage entries). Building either would
  have been data-malpractice.

### Metric semantics (the contract the whole app obeys)
| Metric | Rule |
|---|---|
| Delivery volume / revenue | Keyed on `delivery_date`; revenue realized only on delivery |
| Lead volume / conversion / funnel / sources | Keyed on `created_at` |
| Funnel "reached stage" | From `status_history`, not current status |
| Targets | Summed over selected months only; no partial-month proration |
| Staleness / open pipeline | Snapshot as of the cutoff (last day of the latest reporting month), branch/rep-scoped |

---

## Interesting patterns in the data

- **Systemic shortfall.** 160 units delivered vs a 1,426 target = **11.2% attainment**.
  The best month (December) still only hits 23.9%; June shows 0% purely from the
  ~37-day sales-cycle lag. The whole group is far behind — not one bad branch.
- **Lakeside Toyota (Bangalore) is the outlier.** 7.6% conversion vs 33–41% elsewhere,
  and it owns the entire bottom of the rep leaderboard. It emerges from the data — it
  isn't hard-coded.
- **The biggest leak is early and broad.** Of 288 lost deals, **114 die at `new` and
  81 at `contacted`** — 68% before a test drive — representing **~₹27 Cr** of pipeline
  at the `new` stage never truly engaged. The reasons there are pre-engagement churn:
  "better offer elsewhere", "unresponsive after follow-up", "budget constraints".
- **Financing friction is persistent, not late-stage.** "Financing not approved" recurs
  at every stage (14 / 10 / 8 / 6 from `new` → `negotiation`); its *share* of losses
  rises modestly downstream (≈18% at negotiation vs ≈12% at `new`), so it reads as a
  standing finance-desk friction to smooth, not the dominant leak. (The loss reason ×
  stage matrix on each branch page makes exactly this visible.)
- **Revenue concentrates in a few SUVs.** Just **three models drive 65%** of the
  ₹38.9 Cr delivered — **Fortuner alone is 32%** (₹12.6 Cr), then Innova Hycross (19%)
  and Camry (14%). Stock-out risk and target-setting should follow that mix, not treat
  the line-up as uniform.
- **Channel quality is lopsided.** Walk-ins convert at 45.7% and drive ~half of all
  revenue (₹16 Cr); social media is weakest on both conversion (13.9%) and revenue/lead
  (₹3.5 L). Clear spend-reallocation signal.
- **Structure of the org.** 5 branches, 30 reps = **5 branch managers + 25 sales
  officers**, and only the officers carry leads — a fact the UI reflects rather than
  papers over.
- **Actionable today:** 35 cold leads (₹8.1 Cr), 32 stale order-placed deals (₹7.6 Cr),
  30 past their expected close date (₹6.8 Cr).

---

## What I'd build next with more time

- **Concurrency + history on imports** — imports now persist in Vercel Blob; next would
  be per-user/versioned overlays (an import log you can roll back) rather than one shared
  live dataset, plus optimistic-locking so two concurrent imports can't clobber each other.
- **Follow-up actions on a lead** — the lead page shows the full journey; logging a
  next action or reassigning from there would close the loop.
- **Per-branch narrative summaries** — the overview now carries a deterministic "what
  changed this period" digest; the next step is a per-branch version and an optional
  LLM pass to polish the prose (still grounded in the same reproducible metrics).
- **Created-month cohort view** — leads by created-month cohort to separate cycle lag
  from genuine decline (the digest already sidesteps this artifact by staying
  delivery-anchored).
- **Shareable-view export** and saved filter presets (CSV export on ranked tables ships).
- **Playwright smoke tests** for the core navigation + filter flows (I prioritized unit
  tests on the analytics layer, where correctness risk is highest).

---

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # analytics correctness suite (Vitest)
npm run build
```

The exploratory analysis that grounds every number lives in
[`../analysis/eda.ipynb`](../analysis/eda.ipynb).
