import { expect, type Locator, type Page } from "@playwright/test";
import { FilterBar } from "../components/filter-bar.component";
import { MainNav } from "../components/main-nav.component";
import { KpiRow } from "../components/kpi-card.component";
import { step } from "../support/step";

/** The URL query every dashboard page understands. */
export type FilterQuery = { from?: string; to?: string; branch?: string };

export function toSearch(query: FilterQuery = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Shared chrome every page renders: header, nav, filter bar, page hero, KPI row. */
export abstract class BasePage {
  abstract get path(): string;

  readonly header: Locator;
  readonly filters: FilterBar;
  readonly nav: MainNav;
  readonly kpis: KpiRow;

  constructor(readonly page: Page) {
    this.header = page.getByRole("banner").first();
    this.filters = new FilterBar(this.header);
    this.nav = new MainNav(this.header.getByRole("navigation"));
    this.kpis = new KpiRow(page.getByRole("main"));
  }

  get heading(): Locator {
    return this.page.getByRole("main").getByRole("heading", { level: 1 });
  }

  /** The page hero: title, period label, and scope line. */
  get hero(): Locator {
    return this.page.getByRole("main").locator("header").first();
  }

  /** A card on the page, found by its title. */
  card(title: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.locator('[data-slot="card-title"]').getByText(title, { exact: true }) });
  }

  @step("{0}")
  async open(query: FilterQuery = {}): Promise<this> {
    await this.page.goto(`${this.path}${toSearch(query)}`);
    await this.waitUntilReady();
    return this;
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  searchParams(): URLSearchParams {
    return new URL(this.page.url()).searchParams;
  }
}
