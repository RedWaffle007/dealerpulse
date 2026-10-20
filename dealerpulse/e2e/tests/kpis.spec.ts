import { expect, test } from "../fixtures";
import { filterMatrix } from "../data/filter-matrix";
import { parseNumericCell } from "../components/sortable-table.component";

/**
 * 6 periods x 6 branch choices = 36 URL states. For each, every overview KPI
 * must equal the analytics layer's value for the filter the server should
 * derive from that URL (inverted ranges swapped, unknown months clamped).
 */
test.describe("overview KPIs match the analytics oracle", () => {
  for (const c of filterMatrix()) {
    test(c.id, async ({ app, oracle }) => {
      const overview = await app.overview().open(c.query);
      await expect(overview.kpis).toShowKpis(oracle.overviewKpis(c.query));
      await expect(overview.hero).toContainText(oracle.periodLabel(c.query));
    });
  }
});

/**
 * Cross-view reconciliation: the branch table and the KPI row come from
 * different functions, so checking one against the other on screen needs no
 * oracle at all. The table's Leads and Delivered are a created-in-period cohort,
 * so they reconcile with the conversion tile ("delivered / created leads");
 * Revenue is delivery-dated, so it reconciles with the Revenue tile.
 */
test.describe("branch table reconciles with the KPI row", () => {
  for (const c of filterMatrix().filter((m) => m.branch === "all")) {
    test(c.period, async ({ app }) => {
      const overview = await app.overview().open(c.query);
      const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

      const delivered = sum(await overview.branchTable.columnNumbers("Delivered"));
      const leads = sum(await overview.branchTable.columnNumbers("Leads"));
      const revenueCr = await overview.branchTable.columnNumbers("Revenue");

      const [converted, created] = (await overview.kpis.card("Lead conversion").sub.innerText())
        .replace("leads", "")
        .split("/")
        .map(parseNumericCell);
      expect(created).toBe(leads);
      expect(converted).toBe(delivered);

      // Each row is rounded to 0.01 Cr, so allow half a unit of rounding per row.
      const kpiRevenueCr = parseNumericCell(await overview.kpis.card("Revenue").readValue());
      expect(Math.abs(sum(revenueCr) - kpiRevenueCr)).toBeLessThanOrEqual(0.005 * (revenueCr.length + 1));
    });
  }
});
