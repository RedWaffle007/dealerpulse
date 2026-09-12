# DealerPulse

Performance dashboard for a five-branch Toyota dealer group. It gives a CEO the state of the business at a glance and lets branch managers drill into the exact leads and reps behind the numbers.

Live: https://dealerpulse-sooty.vercel.app/

## Repository

| Path | Description |
|---|---|
| `dealerpulse/` | The Next.js web application (the deliverable). Design rationale in `dealerpulse/DECISIONS.md`. |
| `analysis/eda.ipynb` | Exploratory data analysis that grounds every metric and figure. |
| `dealership_data.json` | The provided dataset, also bundled inside the app. |

## Run locally

```bash
cd dealerpulse
npm install
npm run dev      # http://localhost:3000
npm test         # analytics and merge suite (39 tests)
npm run build
```

## Deploy

Import the repository on Vercel and set the project Root Directory to `dealerpulse`. The Next.js preset is auto-detected and no environment variables are required.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind, Recharts, Zod, and Vitest.
