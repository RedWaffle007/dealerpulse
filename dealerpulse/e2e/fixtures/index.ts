import { test as base, expect as baseExpect, type Page } from "@playwright/test";
import { DatasetApi } from "../api/dataset.api";
import type { KpiRow } from "../components/kpi-card.component";
import { MetricsOracle } from "../oracle/metrics.oracle";
import { PageFactory } from "../pages/page-factory";

type Options = {
  /** Mark the intro splash as already seen, so tests start on the real UI. */
  skipIntro: boolean;
  /** Fail the test on any console error or uncaught page exception. */
  failOnConsoleErrors: boolean;
};

type TestFixtures = {
  app: PageFactory;
  datasetApi: DatasetApi;
  /** Resets the server's dataset overlay before and after the test. */
  pristineDataset: void;
  consoleErrors: string[];
};

type WorkerFixtures = {
  oracle: MetricsOracle;
};

export const test = base.extend<Options & TestFixtures, WorkerFixtures>({
  skipIntro: [true, { option: true }],
  failOnConsoleErrors: [true, { option: true }],

  oracle: [
    async ({}, use) => {
      await use(new MetricsOracle());
    },
    { scope: "worker" },
  ],

  page: async ({ page, skipIntro }, use) => {
    if (skipIntro) await page.addInitScript(() => sessionStorage.setItem("dp-intro-seen", "1"));
    await use(page);
  },

  consoleErrors: [
    async ({ page, failOnConsoleErrors }, use, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console: ${m.text()}`);
      });
      await use(errors);
      if (errors.length) await testInfo.attach("console-errors", { body: errors.join("\n"), contentType: "text/plain" });
      if (failOnConsoleErrors) baseExpect(errors, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    await use(new PageFactory(page));
  },

  datasetApi: async ({ request }, use) => {
    await use(new DatasetApi(request));
  },

  pristineDataset: async ({ datasetApi }, use) => {
    baseExpect((await datasetApi.reset()).ok).toBe(true);
    await use();
    await datasetApi.reset();
  },
});

export const expect = baseExpect.extend({
  /** Retries until every listed KPI tile shows exactly the expected text. */
  async toShowKpis(row: KpiRow, expected: Record<string, string>, options?: { timeout?: number }) {
    const name = "toShowKpis";
    let actual: Record<string, string> = {};
    let pass = false;
    try {
      await baseExpect
        .poll(async () => (actual = await row.readAll()), { timeout: options?.timeout ?? this.timeout })
        .toMatchObject(expected);
      pass = true;
    } catch {
      pass = false;
    }
    const diff = Object.entries(expected)
      .filter(([k, v]) => actual[k] !== v)
      .map(([k, v]) => `  ${k}: expected "${v}", got "${actual[k] ?? "(missing)"}"`)
      .join("\n");
    return {
      name,
      pass,
      expected,
      actual,
      message: () =>
        pass
          ? `${this.utils.matcherHint(name, undefined, undefined, { isNot: this.isNot })}\n\nKPIs matched but were expected not to.`
          : `${this.utils.matcherHint(name, undefined, undefined, { isNot: this.isNot })}\n\nKPI mismatch:\n${diff}`,
    };
  },
});

export type { Page };
