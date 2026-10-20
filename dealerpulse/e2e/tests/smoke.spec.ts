import { expect, test } from "../fixtures";
import type { NavItem } from "../components/main-nav.component";

test.describe("every route renders @smoke", () => {
  const routes: { item: NavItem; path: string; heading: string | RegExp }[] = [
    { item: "Overview", path: "/", heading: "Executive overview" },
    { item: "Sales Team", path: "/reps", heading: "Sales team" },
    { item: "Action Center", path: "/actions", heading: "Action Center" },
    { item: "What-If Lab", path: "/scenarios", heading: /./ },
    { item: "Data Import", path: "/upload", heading: "Data Import" },
  ];

  for (const r of routes) {
    test(`${r.item} loads with its heading and marks itself active @responsive`, async ({ app, page }) => {
      const response = await page.goto(r.path);
      expect(response?.status()).toBe(200);
      const overview = app.overview();
      await expect(overview.heading).toHaveText(r.heading);
      await expect(overview.nav.current).toHaveText(r.item);
    });
  }

  test("nav moves between every section", async ({ app }) => {
    const overview = await app.overview().open();
    for (const item of ["Sales Team", "Action Center", "What-If Lab", "Data Import", "Overview"] as const) {
      await overview.nav.open(item);
      await expect(overview.nav.current).toHaveText(item);
    }
  });
});

test.describe("unknown records show the 404 page", () => {
  // The browser logs the 404 document response itself; that error is the point here.
  test.use({ failOnConsoleErrors: false });

  for (const path of ["/branches/B99", "/reps/SR999", "/leads/L9999", "/no-such-page"]) {
    test(path, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "Record not found" })).toBeVisible();
      await page.getByRole("link", { name: "Back to overview" }).click();
      await expect(page).toHaveURL("/");
    });
  }
});

test.describe("intro splash", () => {
  test.use({ skipIntro: false });

  test("greets a fresh tab once, then gets out of the way", async ({ page }) => {
    await page.goto("/");
    const splash = page.locator(".dp-intro");
    await expect(splash).toBeVisible();
    await expect(splash).toBeHidden({ timeout: 6_000 });
    await page.reload();
    await expect(splash).toBeHidden();
  });
});
