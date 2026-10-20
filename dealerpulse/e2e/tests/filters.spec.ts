import { expect, test } from "../fixtures";

test.describe("global filter bar", () => {
  test("choosing a branch scopes the page and the URL", async ({ app, oracle }) => {
    const overview = await app.overview().open();
    await overview.filters.selectBranch("Highway Toyota");

    expect(overview.searchParams().get("branch")).toBe("B2");
    await expect(overview.kpis).toShowKpis(oracle.overviewKpis({ branch: "B2" }));
    await expect(overview.hero).toContainText("Highway Toyota");
  });

  test("period presets write the expected range", async ({ app, oracle }) => {
    const overview = await app.overview().open();
    await overview.filters.selectPeriod("Q3 (Jul–Sep)");
    expect(Object.fromEntries(overview.searchParams())).toMatchObject({ from: "2025-07", to: "2025-09" });
    await expect(overview.kpis).toShowKpis(oracle.overviewKpis({ from: "2025-07", to: "2025-09" }));

    await overview.filters.selectPeriod("Latest month");
    expect(Object.fromEntries(overview.searchParams())).toMatchObject({ from: "2025-12", to: "2025-12" });
  });

  test("From cannot pass To: later months are disabled", async ({ app }) => {
    const overview = await app.overview().open({ from: "2025-06", to: "2025-08" });
    const options = await overview.filters.options("From");
    const enabled = options.filter((o) => !o.disabled).map((o) => o.label);
    expect(enabled).toEqual(["Jun 2025", "Jul 2025", "Aug 2025"]);
  });

  test("a custom From and To range drives the KPIs and clears the preset", async ({ app, oracle }) => {
    const overview = await app.overview().open();
    await overview.filters.selectFrom("Aug 2025");
    await overview.filters.selectTo("Oct 2025");
    expect(Object.fromEntries(overview.searchParams())).toMatchObject({ from: "2025-08", to: "2025-10" });
    expect(await overview.filters.value("Period")).toBe("Custom range");
    await expect(overview.kpis).toShowKpis(oracle.overviewKpis({ from: "2025-08", to: "2025-10" }));
  });

  test("triggers show labels, not raw URL values, on first load", async ({ app }) => {
    const overview = await app.overview().open({ from: "2025-10", to: "2025-12", branch: "B4" });
    expect(await overview.filters.value("Period")).toBe("Q4 (Oct–Dec)");
    expect(await overview.filters.value("From")).toBe("Oct 2025");
    expect(await overview.filters.value("To")).toBe("Dec 2025");
    expect(await overview.filters.value("Branch")).toBe("Central Toyota");
  });

  test("URL state survives a reload", async ({ app, oracle, page }) => {
    const query = { from: "2025-10", to: "2025-12", branch: "B4" };
    const overview = await app.overview().open(query);
    await page.reload();
    await overview.waitUntilReady();
    expect(await overview.filters.value("Branch")).toBe("Central Toyota");
    expect(await overview.filters.value("Period")).toBe("Q4 (Oct–Dec)");
    await expect(overview.kpis).toShowKpis(oracle.overviewKpis(query));
  });

  test("filter bar is usable at phone width @responsive", async ({ app }) => {
    const overview = await app.overview().open();
    await overview.filters.selectBranch("Lakeside Toyota");
    expect(overview.searchParams().get("branch")).toBe("B3");
  });
});
