import { expect, test } from "../fixtures";
import { formatDate, formatINR } from "@/lib/format";

test.describe("drill-downs keep the user's context", () => {
  test("branch link opens the branch with the same period", async ({ app, oracle, page }) => {
    const query = { from: "2025-10", to: "2025-12" };
    const overview = await app.overview().open(query);
    await overview.openBranch(oracle.branchName("B3"));

    await expect(page).toHaveURL(/\/branches\/B3\?/);
    const branch = app.branch("B3");
    await expect(branch.heading).toHaveText(oracle.branchName("B3"));
    expect(Object.fromEntries(branch.searchParams())).toMatchObject(query);
  });

  test("alerts button opens the Action Center with period and branch", async ({ app, page }) => {
    const overview = await app.overview().open({ from: "2025-08", to: "2025-11", branch: "B1" });
    await overview.reviewAlerts.click();
    await expect(page).toHaveURL(/\/actions\?/);
    expect(Object.fromEntries(app.actions().searchParams())).toMatchObject({
      from: "2025-08",
      to: "2025-11",
      branch: "B1",
    });
  });

  test("on-page KPI cards jump to their section", async ({ app, page }) => {
    const overview = await app.overview().open();
    await overview.kpis.card("Lead conversion").drillDown();
    await expect(page).toHaveURL(/#funnel$/);
    await expect(overview.card("Conversion funnel")).toBeInViewport();
  });

  test("lead page shows the record behind a delivery", async ({ app, oracle }) => {
    const { lead, delivery } = oracle.deliveredLead();
    const page = await app.lead(lead.id).open();
    await expect(page.heading).toHaveText(lead.customer_name);
    await expect(page.kpis.card("Deal value").value).toHaveText(formatINR(lead.deal_value));
    await expect(page.detail("Branch")).toHaveText(oracle.branchName(lead.branch_id));
    await expect(page.detail("Delivery date")).toHaveText(formatDate(delivery.delivery_date));
  });

  test("rep leaderboard links to each rep's page", async ({ app, page }) => {
    const reps = await app.reps().open();
    await reps.leaderboard.expectRowCount(await reps.leaderboard.rows.count());
    const firstRep = reps.leaderboard.rows.first().getByRole("link").first();
    const name = (await firstRep.innerText()).trim();
    await firstRep.click();
    await expect(page).toHaveURL(/\/reps\/[^/?]+/);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(name);
  });
});
