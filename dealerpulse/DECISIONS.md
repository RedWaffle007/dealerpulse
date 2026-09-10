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
**company → branch → rep** throughout.

### Design & UX
The look is deliberately restrained — a neutral, data-dense base (Linear/Vercel-style)
with a single indigo brand accent, so **color carries meaning rather than decoration**:
attainment and alerts read green/amber/red by health, and the accent marks only
navigation, links, and the active view. Every page shares one headline band, the nav
always shows where you are, and each filter is captioned so nothing is a mystery.

### The differentiator: the Action Center
Most dashboards stop at "social media converts at 14%." This one ends at a ranked,
explainable worklist: _"Order placed but no activity for 194 days — delivery at
risk. Omkar Varma, Lakeside, ₹51 L."_ Rules are pure functions (no black box),
ranked by **deal value × stage depth × days idle**, each carrying a one-line reason.

---

## Key product decisions & tradeoffs

- **"Now" = the dataset cutoff (2025-12-31), not the wall clock.** Aging and the
  action queue are meaningless against today's date (the data is historical). This
  is stated in the UI so nobody mistakes it for live data.
- **Client-side vs. backend:** the dataset is 622 KB. I parse + Zod-validate it once
  on the **server** (so it never bloats the client bundle) and compute every metric in
  a pure, memoized selector layer. No database earns its keep here.
- **Correctness is a feature, so I tested it.** The analytics layer has a 20-test Vitest
  suite asserting the exact figures I verified in `../analysis/eda.ipynb` (160 delivered,
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
| Staleness / open pipeline | Snapshot as of the cutoff, branch/rep-scoped |

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

- **Lead-detail drill-through** — click any action item to open its full status-history
  timeline and log a follow-up.
- **Templated natural-language summaries** — a per-branch "what changed and why" written
  from the same deterministic metrics (trustworthy, reproducible; an optional LLM pass
  could polish the prose).
- **Created-month cohort view** — leads by created-month cohort to separate cycle lag
  from genuine decline.
- **Promote two more Action Center rules** — "branch behind target" and "delivery
  delayed" exist as views today; ranking them as alerts would complete the worklist.
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
