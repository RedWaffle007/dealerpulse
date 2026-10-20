import { expect, test } from "../../fixtures";
import { ContinuationBuilder } from "../../data/continuation.builder";

test.describe.configure({ mode: "serial" });

test.describe("POST /api/dataset contract", () => {
  test.use({ failOnConsoleErrors: false });

  test("rejects a body that is not JSON with 400", async ({ datasetApi, pristineDataset }) => {
    void pristineDataset;
    const res = await datasetApi.mergeRaw("{ not json");
    expect(res.status).toBe(400);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.body.error).toBe("Body is not valid JSON.");
  });

  test("rejects a schema-invalid section with 422 and points at the field", async ({ datasetApi, oracle, pristineDataset }) => {
    void pristineDataset;
    const payload = ContinuationBuilder.from(oracle.dataset).withTarget("B1").buildUnchecked();
    (payload.targets[0] as Record<string, unknown>).target_units = "twenty";

    const res = await datasetApi.merge(payload);
    expect(res.status).toBe(422);
    if (res.ok) throw new Error("expected a validation error");
    expect(res.body.issues?.[0]?.path).toEqual(["targets", 0, "target_units"]);
  });

  test("merges a valid continuation and reports exact section diffs", async ({ datasetApi, oracle, pristineDataset }) => {
    void pristineDataset;
    const builder = ContinuationBuilder.from(oracle.dataset)
      .forEveryBranch((b, id) => b.withTarget(id).withDeliveredDeal(id).withOpenLead(id));
    const payload = builder.build();

    const res = await datasetApi.merge(payload);
    expect(res.status).toBe(200);
    if (!res.ok) throw new Error(res.body.error);
    expect(res.body.summary).toMatchObject({
      leads: { added: payload.leads.length, updated: 0 },
      deliveries: { added: payload.deliveries.length, updated: 0 },
      targets: { added: payload.targets.length, updated: 0 },
      newMonths: [builder.month],
    });
  });

  test("re-sending the same upload updates records instead of duplicating them", async ({ datasetApi, oracle, pristineDataset }) => {
    void pristineDataset;
    const payload = ContinuationBuilder.from(oracle.dataset).withTarget("B2").withDeliveredDeal("B2").build();

    const first = await datasetApi.merge(payload);
    const second = await datasetApi.merge(payload);
    if (!first.ok || !second.ok) throw new Error("merge failed");
    expect(second.body.summary.leads).toEqual({ added: 0, updated: first.body.summary.leads.added });
    expect(second.body.summary.newMonths).toEqual([]);
  });

  test("DELETE resets to the bundled dataset", async ({ datasetApi, oracle, pristineDataset, app }) => {
    void pristineDataset;
    await datasetApi.merge(ContinuationBuilder.from(oracle.dataset).withTarget("B3").withDeliveredDeal("B3").build());
    expect((await datasetApi.reset()).ok).toBe(true);

    const upload = await app.upload().open();
    await expect(upload.stat("Leads")).toHaveText(oracle.dataset.leads.length.toLocaleString("en-IN"));
  });
});
