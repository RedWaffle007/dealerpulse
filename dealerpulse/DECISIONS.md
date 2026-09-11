# DECISIONS.md — DealerPulse

A real-time performance dashboard for a 5-branch Toyota dealer group. Built for a
CEO to grasp the state of the business in 30 seconds, and for branch managers to
drill into the exact leads and reps behind the numbers.

**Live:** _https://dealerpulse-sooty.vercel.app/_ · **Stack:** Next.js 16 (App Router) · TypeScript ·
Tailwind + shadcn/ui · Recharts · Zod · Vitest

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
- **KPI cards are drill-downs.** Every headline number links straight to the data
  behind it (attainment/revenue/units → the branch table; conversion → the funnel;
  pipeline/cold → the Action Center), so a CEO clicks the number they care about.
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
- **Import merge is validated and honest about persistence.** The Data Import screen reuses
  the same Zod schema to validate a continuation, then merges via a pure `mergeDatasets`
  function (upsert by id) that the metrics layer reads through unchanged. The merged
  result is held **in server memory** (on `globalThis`, so the API writer and the page
  readers share one instance): it persists while the server is warm and resets on
  restart/redeploy, and is not shared across serverless instances. I chose this over a
  half-built database so the flow works end-to-end and stays truthful about its limits;
  production would swap the in-memory store for Vercel KV/Blob or a database behind the
  same interface. The tradeoff is stated in the UI.
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

- **Durable upload storage** — the upload/merge flow works end-to-end but keeps the
  merged dataset in server memory; backing it with Vercel KV/Blob or a database (behind
  the same interface) would make merges persist and be shared across instances.
- **Follow-up actions on a lead** — the lead page shows the full journey; logging a
  next action or reassigning from there would close the loop.
- **Templated natural-language summaries** — a per-branch "what changed and why" written
  from the same deterministic metrics (trustworthy, reproducible; an optional LLM pass
  could polish the prose).
- **Created-month cohort view** — leads by created-month cohort to separate cycle lag
  from genuine decline.
- **CSV / shareable-view export** and saved filter presets.
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
