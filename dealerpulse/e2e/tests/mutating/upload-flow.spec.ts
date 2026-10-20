import { expect, test } from "../../fixtures";
import { ContinuationBuilder } from "../../data/continuation.builder";
import { MetricsOracle } from "../../oracle/metrics.oracle";
import { mergeDatasets } from "@/lib/merge";
import { formatMonth } from "@/lib/format";

test.describe.configure({ mode: "serial" });

test.describe("data import flow", () => {
  test("uploaded file merges, extends coverage, moves the KPIs, and resets cleanly", async ({ app, oracle, pristineDataset }) => {
    void pristineDataset;
    const builder = ContinuationBuilder.from(oracle.dataset).forEveryBranch((b, id) =>
      b.withTarget(id).withDeliveredDeal(id, 5_000_000),
    );
    const payload = builder.build();
    const merged = new MetricsOracle(mergeDatasets(oracle.dataset, payload).merged);

    const upload = await app.upload().open();
    await upload.chooseFile("continuation.json", JSON.stringify(payload));
    await expect(upload.page.getByText("Ready to merge: continuation.json")).toBeVisible();
    await expect(upload.page.getByText(`${payload.leads.length} leads`, { exact: true })).toBeVisible();

    await upload.mergeAndWait();
    await expect(upload.stat("Leads")).toHaveText((oracle.dataset.leads.length + payload.leads.length).toLocaleString("en-IN"));
    await expect(upload.stat("Coverage")).toContainText(formatMonth(builder.month));
    await expect(upload.resetButton).toBeEnabled();

    const newMonthOnly = { from: builder.month, to: builder.month };
    const overview = await app.overview().open(newMonthOnly);
    await expect(overview.kpis).toShowKpis(merged.overviewKpis(newMonthOnly));
    await expect(overview.kpis.card("Units delivered").value).toHaveText(String(payload.deliveries.length));

    await app.upload().open();
    await upload.resetButton.click();
    await expect(upload.page.getByText("No imported changes.")).toBeVisible();
    await expect(upload.stat("Leads")).toHaveText(oracle.dataset.leads.length.toLocaleString("en-IN"));
  });

  test("sample data can be previewed and cancelled without touching the dataset", async ({ app, oracle, pristineDataset }) => {
    void pristineDataset;
    const upload = await app.upload().open();
    await upload.trySample.click();
    await expect(upload.mergeButton).toBeVisible();
    await upload.cancelButton.click();
    await expect(upload.mergeButton).toBeHidden();
    await expect(upload.stat("Leads")).toHaveText(oracle.dataset.leads.length.toLocaleString("en-IN"));
  });

  test("a file that is not a JSON object is refused before any request", async ({ app, page, pristineDataset }) => {
    void pristineDataset;
    const upload = await app.upload().open();
    let posted = false;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/dataset") && r.method() === "POST") posted = true;
    });

    await upload.chooseFile("list.json", "[1, 2, 3]");
    await expect(upload.errorBanner).toHaveText("Expected a JSON object with dataset sections.");
    await expect(upload.mergeButton).toBeHidden();
    expect(posted).toBe(false);
  });

  test.describe(() => {
    // The browser logs the 422 response this test provokes on purpose.
    test.use({ failOnConsoleErrors: false });

    test("a server-side validation failure is shown to the user", async ({ app, oracle, pristineDataset }) => {
      void pristineDataset;
      const bad = ContinuationBuilder.from(oracle.dataset).withTarget("B1").buildUnchecked();
      (bad.targets[0] as Record<string, unknown>).month = 202601;

      const upload = await app.upload().open();
      await upload.chooseFile("bad.json", JSON.stringify(bad));
      await upload.mergeButton.click();
      await expect(upload.errorBanner).toHaveText("Upload failed validation.");
      await expect(upload.successBanner).toBeHidden();
    });
  });
});
