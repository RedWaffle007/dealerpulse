# DealerPulse — FDE Take-Home

Real-time performance dashboard for a 5-branch dealer group.

| Path | What it is |
|---|---|
| [`dealerpulse/`](./dealerpulse) | The Next.js web app (the deliverable). See [`dealerpulse/DECISIONS.md`](./dealerpulse/DECISIONS.md). |
| [`analysis/eda.ipynb`](./analysis/eda.ipynb) | Exploratory data analysis that grounds every metric and figure. |
| [`PLAN.md`](./PLAN.md) | Build plan + the metric-semantics contract. |
| `dealership_data.json` | The provided dataset (also bundled inside the app). |

## Run the app
```bash
cd dealerpulse
npm install
npm run dev      # http://localhost:3000
npm test         # analytics correctness suite (17 tests)
npm run build
```

## Deploy to Vercel
Import the repo at [vercel.com/new](https://vercel.com/new) and set the project
**Root Directory** to `dealerpulse`. Framework preset (Next.js) is auto-detected;
no environment variables are required.
