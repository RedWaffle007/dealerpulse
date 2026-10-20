import type { FilterQuery } from "../pages/base.page";

/** Period levels, including an inverted range the server must swap, not reject. */
export const PERIODS = {
  all: {},
  q3: { from: "2025-07", to: "2025-09" },
  q4: { from: "2025-10", to: "2025-12" },
  latest: { from: "2025-12", to: "2025-12" },
  inverted: { from: "2025-11", to: "2025-08" },
  unknownMonth: { from: "1999-01", to: "2025-07" },
} as const satisfies Record<string, FilterQuery>;

export const BRANCHES = ["all", "B1", "B2", "B3", "B4", "B5"] as const;

export type PeriodKey = keyof typeof PERIODS;
export type BranchKey = (typeof BRANCHES)[number];
export type FilterCase = { id: string; period: PeriodKey; branch: BranchKey; query: FilterQuery };

/** Every period crossed with every branch: 36 URL states, cheap enough to run exhaustively. */
export function filterMatrix(): FilterCase[] {
  return (Object.keys(PERIODS) as PeriodKey[]).flatMap((period) =>
    BRANCHES.map((branch) => ({
      id: `${period} x ${branch}`,
      period,
      branch,
      query: { ...PERIODS[period], ...(branch === "all" ? {} : { branch }) },
    })),
  );
}
