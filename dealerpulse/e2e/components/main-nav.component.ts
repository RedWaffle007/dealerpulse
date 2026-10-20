import type { Locator } from "@playwright/test";
import { step } from "../support/step";
import { BaseComponent } from "./base.component";

export type NavItem = "Overview" | "Sales Team" | "Action Center" | "What-If Lab" | "Data Import";

export class MainNav extends BaseComponent {
  link(item: NavItem): Locator {
    return this.root.getByRole("link", { name: item, exact: true });
  }

  get current(): Locator {
    return this.root.locator('[aria-current="page"]');
  }

  @step("{0}")
  async open(item: NavItem): Promise<void> {
    await this.link(item).click();
  }
}
