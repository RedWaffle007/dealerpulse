import type { Locator } from "@playwright/test";
import { step } from "../support/step";
import { BaseComponent } from "./base.component";

/** One KPI tile. Linked tiles are drill-downs to the data behind the number. */
export class KpiCard extends BaseComponent {
  get value(): Locator {
    return this.root.getByTestId("kpi-value");
  }

  get sub(): Locator {
    return this.root.getByTestId("kpi-sub");
  }

  /** The drill-down link that wraps the card, when the card has one. */
  get link(): Locator {
    return this.root.locator("xpath=ancestor::a[1]");
  }

  async readValue(): Promise<string> {
    return (await this.value.innerText()).trim();
  }

  @step()
  async drillDown(): Promise<void> {
    await this.link.click();
  }
}

/** Every KPI tile on a page, addressed by its label. */
export class KpiRow extends BaseComponent {
  card(label: string): KpiCard {
    return new KpiCard(
      this.root
        .getByTestId("kpi-card")
        .filter({ has: this.page.getByTestId("kpi-label").getByText(label, { exact: true }) }),
    );
  }

  async labels(): Promise<string[]> {
    return (await this.root.getByTestId("kpi-label").allInnerTexts()).map((t) => t.trim());
  }

  /** Label to displayed value, for every tile in the row. */
  async readAll(): Promise<Record<string, string>> {
    const cards = this.root.getByTestId("kpi-card");
    const entries = await cards.evaluateAll((els) =>
      els.map((el) => [
        el.querySelector('[data-testid="kpi-label"]')?.textContent?.trim() ?? "",
        el.querySelector('[data-testid="kpi-value"]')?.textContent?.trim() ?? "",
      ]),
    );
    return Object.fromEntries(entries);
  }
}
