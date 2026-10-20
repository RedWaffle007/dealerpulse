import { expect, type Locator, type Page } from "@playwright/test";
import { SortableTable } from "../components/sortable-table.component";
import { step } from "../support/step";
import { BasePage } from "./base.page";

export class OverviewPage extends BasePage {
  get path(): string {
    return "/";
  }

  readonly branchTable: SortableTable;
  readonly reviewAlerts: Locator;
  readonly importData: Locator;

  constructor(page: Page) {
    super(page);
    this.branchTable = new SortableTable(this.card("Branch performance"));
    this.reviewAlerts = page.getByRole("link", { name: /^Review \d+ alerts/ });
    this.importData = page.getByRole("main").getByRole("link", { name: "Import data" });
  }

  @step("{0}")
  async openBranch(name: string): Promise<void> {
    await this.card("Branch performance").getByRole("link", { name, exact: true }).click();
  }
}

export class BranchPage extends BasePage {
  constructor(
    page: Page,
    readonly branchId: string,
  ) {
    super(page);
  }

  get path(): string {
    return `/branches/${this.branchId}`;
  }
}

export class RepsPage extends BasePage {
  get path(): string {
    return "/reps";
  }
  readonly leaderboard: SortableTable;

  constructor(page: Page) {
    super(page);
    this.leaderboard = new SortableTable(this.card("Rep leaderboard"));
  }
}

export class RepPage extends BasePage {
  readonly openLeads: SortableTable;

  constructor(
    page: Page,
    readonly repId: string,
  ) {
    super(page);
    this.openLeads = new SortableTable(this.card("Open leads"));
  }

  get path(): string {
    return `/reps/${this.repId}`;
  }
}

export class LeadPage extends BasePage {
  constructor(
    page: Page,
    readonly leadId: string,
  ) {
    super(page);
  }

  get path(): string {
    return `/leads/${this.leadId}`;
  }

  /** A value from the Details card, by its row label. */
  detail(label: string): Locator {
    return this.card("Details").getByText(label, { exact: true }).locator("xpath=following-sibling::*[1]");
  }
}

export class ActionsPage extends BasePage {
  get path(): string {
    return "/actions";
  }
}

export class ScenariosPage extends BasePage {
  get path(): string {
    return "/scenarios";
  }
}

export class UploadPage extends BasePage {
  get path(): string {
    return "/upload";
  }

  readonly fileInput: Locator;
  readonly trySample: Locator;
  readonly mergeButton: Locator;
  readonly cancelButton: Locator;
  readonly resetButton: Locator;
  readonly errorBanner: Locator;
  readonly successBanner: Locator;

  constructor(page: Page) {
    super(page);
    const main = page.getByRole("main");
    this.fileInput = main.locator('input[type="file"]');
    this.trySample = main.getByRole("button", { name: "Try sample data" });
    this.mergeButton = main.getByRole("button", { name: "Merge into dataset" });
    this.cancelButton = main.getByRole("button", { name: "Cancel" });
    this.resetButton = main.getByRole("button", { name: "Reset to original" });
    this.errorBanner = main.locator("p.text-red-600");
    this.successBanner = main.getByText("Merged successfully.");
  }

  /** The dataset stat tiles above the importer (Leads, Deliveries, Targets, Coverage). */
  stat(label: "Leads" | "Deliveries" | "Targets" | "Coverage"): Locator {
    return this.page
      .getByRole("main")
      .getByText(label, { exact: true })
      .locator("xpath=following-sibling::*[1]");
  }

  @step("{0}")
  async chooseFile(name: string, contents: string): Promise<void> {
    await this.fileInput.setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(contents) });
  }

  @step()
  async mergeAndWait(): Promise<void> {
    await this.mergeButton.click();
    await expect(this.successBanner).toBeVisible();
  }
}
