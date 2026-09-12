# DealerPulse

The DealerPulse web application: a performance dashboard for a five-branch Toyota dealer group. It gives a CEO the state of the business at a glance and lets branch managers drill into the exact leads and reps behind the numbers.

Live: https://dealerpulse-sooty.vercel.app/

Design decisions and tradeoffs are documented in [`DECISIONS.md`](./DECISIONS.md).

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # analytics and merge suite (39 tests)
npm run build
```

## Deploy

Deploys to Vercel with the project Root Directory set to `dealerpulse`. The Next.js preset is auto-detected and no environment variables are required.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind, Recharts, Zod, and Vitest.
