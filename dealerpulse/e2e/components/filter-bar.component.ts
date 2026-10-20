import { expect, type Locator } from "@playwright/test";
import { step } from "../support/step";
import { BaseComponent } from "./base.component";

export type PeriodPreset = "All months" | "Q3 (Jul–Sep)" | "Q4 (Oct–Dec)" | "Latest month";
type FieldName = "Period" | "From" | "To" | "Branch";

/** The global period and branch filter in the sticky header. State lives in the URL. */
export class FilterBar extends BaseComponent {
  private field(name: FieldName): Locator {
    return this.root
      .locator("label")
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .getByRole("combobox");
  }

  private async choose(name: FieldName, option: string): Promise<void> {
    const urlBefore = this.page.url();
    await this.field(name).click();
    const choice = this.page.getByRole("option", { name: option, exact: true });
    const alreadySelected = (await choice.getAttribute("aria-selected")) === "true";
    await choice.click();
    // A new choice is a client-side router push; wait for it to land.
    if (!alreadySelected) await expect.poll(() => this.page.url()).not.toBe(urlBefore);
    await this.page.waitForLoadState("networkidle");
  }

  @step("{0}")
  async selectPeriod(preset: PeriodPreset): Promise<void> {
    await this.choose("Period", preset);
  }

  @step("{0}")
  async selectFrom(monthLabel: string): Promise<void> {
    await this.choose("From", monthLabel);
  }

  @step("{0}")
  async selectTo(monthLabel: string): Promise<void> {
    await this.choose("To", monthLabel);
  }

  @step("{0}")
  async selectBranch(branchName: string): Promise<void> {
    await this.choose("Branch", branchName);
  }

  async value(name: FieldName): Promise<string> {
    return (await this.field(name).innerText()).trim();
  }

  /** Options of a dropdown with their enabled state, read by opening it. */
  @step("{0}")
  async options(name: FieldName): Promise<{ label: string; disabled: boolean }[]> {
    await this.field(name).click();
    const options = this.page.getByRole("option");
    await expect(options.first()).toBeVisible();
    const result = await options.evaluateAll((els) =>
      els.map((el) => ({
        label: (el.textContent ?? "").trim(),
        disabled: el.getAttribute("aria-disabled") === "true" || el.hasAttribute("data-disabled"),
      })),
    );
    await this.page.keyboard.press("Escape");
    return result;
  }
}
