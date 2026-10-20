import { expect, test } from "../fixtures";
import type { SortDirection } from "../components/sortable-table.component";

const NUMERIC_COLUMNS = ["Leads", "Delivered", "Conv.", "Attainment", "Revenue"] as const;
const DIRECTIONS: SortDirection[] = ["asc", "desc"];

test.describe("branch performance table", () => {
  test("lists one row per branch, lowest attainment first", async ({ app, oracle }) => {
    const overview = await app.overview().open();
    const expected = oracle
      .branchRows({})
      .sort((a, b) => a.attainmentPct - b.attainmentPct)
      .map((r) => r.name);
    expect(await overview.branchTable.columnTexts("Branch")).toEqual(expected);
  });

  for (const column of NUMERIC_COLUMNS) {
    for (const dir of DIRECTIONS) {
      test(`sorts ${column} ${dir} by value, not by text`, async ({ app }) => {
        const overview = await app.overview().open();
        await overview.branchTable.sortBy(column, dir);
        const values = await overview.branchTable.columnNumbers(column);
        const sorted = [...values].sort((a, b) => (dir === "asc" ? a - b : b - a));
        expect(values).toEqual(sorted);
      });
    }
  }

  test("sorts branch names alphabetically", async ({ app }) => {
    const overview = await app.overview().open();
    await overview.branchTable.sortBy("Branch", "asc");
    const names = await overview.branchTable.columnTexts("Branch");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test("CSV export follows the on-screen sort and carries raw values", async ({ app, oracle }) => {
    const query = { from: "2025-07", to: "2025-09" };
    const overview = await app.overview().open(query);
    await overview.branchTable.sortBy("Revenue", "desc");

    const { download, rows } = await overview.branchTable.downloadCsv();
    expect(download.suggestedFilename()).toBe("dealerpulse-branches-2025-07_2025-09.csv");

    const [header, ...body] = rows;
    expect(header).toEqual(["Branch", "Leads", "Delivered", "Conv.", "Attainment", "Revenue"]);
    expect(body.map((r) => r[0])).toEqual(await overview.branchTable.columnTexts("Branch"));

    const byName = new Map(oracle.branchRows(query).map((r) => [r.name, r]));
    for (const [name, leads, delivered, , , revenue] of body) {
      const want = byName.get(name);
      expect(want, `branch ${name} in oracle`).toBeDefined();
      expect(Number(leads)).toBe(want!.leads);
      expect(Number(delivered)).toBe(want!.delivered);
      expect(Number(revenue)).toBe(want!.revenue);
    }
  });
});
